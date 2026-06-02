import fs from "fs";
import path from "path";
import type { GoldPriceRaw } from "./types";
import fallbackGold from "./fallbackGold.json";

// ── Paths ───────────────────────────────────────────────────────────────
const DATA_DIR = path.join(process.cwd(), "data");
const PERSIST_FILE = path.join(DATA_DIR, "gold.json");
const DISK_CACHE_ENABLED = process.env.VERCEL !== "1";

// ── TTL ─────────────────────────────────────────────────────────────────
const TTL = 60 * 1000; // 1 minute

// ── In-memory state ─────────────────────────────────────────────────────
let cache: GoldPriceRaw | null = null;
let lastFetch = 0;
let lastKnownGood: GoldPriceRaw | null = null;

// ── Logging helper ──────────────────────────────────────────────────────
function log(level: "info" | "warn" | "error", message: string) {
  const ts = new Date().toISOString();
  const prefix = `[gold-cache ${level.toUpperCase()} ${ts}]`;
  if (level === "error") {
    console.error(prefix, message);
  } else if (level === "warn") {
    console.warn(prefix, message);
  } else {
    console.log(prefix, message);
  }
}

// ── Persistent cache: save ──────────────────────────────────────────────
function saveToDisk(data: GoldPriceRaw): void {
  if (!DISK_CACHE_ENABLED) return;

  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(PERSIST_FILE, JSON.stringify(data, null, 2), "utf-8");
    log("info", "Saved gold data to disk");
  } catch (err) {
    log("warn", `Failed to save to disk: ${err}`);
  }
}

// ── Persistent cache: load ──────────────────────────────────────────────
function loadFromDisk(): GoldPriceRaw | null {
  if (!DISK_CACHE_ENABLED) return null;

  try {
    if (fs.existsSync(PERSIST_FILE)) {
      const raw = fs.readFileSync(PERSIST_FILE, "utf-8");
      const data = JSON.parse(raw) as GoldPriceRaw;
      if (data.buy && data.sell && data.updatedAt) {
        log("info", `Loaded gold data from disk: buy=${data.buy}, sell=${data.sell}`);
        return data;
      }
    }
  } catch (err) {
    log("warn", `Failed to load from disk: ${err}`);
  }
  return null;
}

// ── Initialize: load persistent cache on first import ───────────────────
function initialize(): void {
  if (!lastKnownGood) {
    const diskData = loadFromDisk();
    if (diskData) {
      lastKnownGood = diskData;
      cache = diskData;
      log("info", "Initialized cache from persistent storage");
    } else {
      // No disk cache (e.g. on Vercel) — seed last-known-good from the
      // bundled fallback so a failed scrape never returns a hard error.
      lastKnownGood = fallbackGold as GoldPriceRaw;
      log("info", "Initialized last-known-good from bundled fallback");
    }
  }
}

initialize();

// ── Main entry point ────────────────────────────────────────────────────

export interface CacheResult {
  data: GoldPriceRaw;
  /** true if this data came from fallback (last known good) instead of fresh scrape */
  fromFallback: boolean;
}

/**
 * Get gold price with multi-layer caching:
 *
 * 1. If TTL cache is fresh → return it
 * 2. Try fetcher (scrapeGoldPrice with retries)
 * 3. On success → update cache + lastKnownGood + persist to disk
 * 4. On failure → fallback to lastKnownGood (if exists)
 * 5. If nothing at all → throw
 */
export async function getGoldPriceCached(
  fetcher: () => Promise<GoldPriceRaw>
): Promise<CacheResult> {
  const now = Date.now();

  // Layer 1: TTL cache still fresh
  if (cache && now - lastFetch < TTL) {
    return { data: cache, fromFallback: false };
  }

  // Layer 2: Try fresh scrape
  try {
    const fresh = await fetcher();

    // Update all cache layers
    cache = fresh;
    lastFetch = now;
    lastKnownGood = fresh;
    saveToDisk(fresh);

    return { data: fresh, fromFallback: false };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    log("error", `Scrape failed: ${message}`);

    // Layer 3: Fallback to last known good
    if (lastKnownGood) {
      log("warn", `Using last known good data (buy=${lastKnownGood.buy}, sell=${lastKnownGood.sell})`);
      // Update TTL so we don't hammer the source on every request
      cache = lastKnownGood;
      lastFetch = now;
      return { data: lastKnownGood, fromFallback: true };
    }

    // Layer 4: Try loading from disk one more time
    const diskData = loadFromDisk();
    if (diskData) {
      lastKnownGood = diskData;
      cache = diskData;
      lastFetch = now;
      log("warn", "Recovered from disk after scrape failure");
      return { data: diskData, fromFallback: true };
    }

    // No data at all
    throw new Error(`No gold data available. Last error: ${message}`);
  }
}
