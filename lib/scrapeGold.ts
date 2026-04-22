import axios from "axios";
import * as cheerio from "cheerio";
import type { GoldPriceRaw } from "./types";

const GOLD_API_URL = "https://goldtraders.or.th/api/GoldPrices/Latest?readjson=false";
const CLASSIC_GOLD_URL = "https://classic.goldtraders.or.th/";

// ── Selector sets (primary first, fallback second) ──────────────────────
const SELECTOR_SETS = [
  {
    name: "goldprices1",
    buy: "#DetailPlace_uc_goldprices1_lblBLBuy",
    sell: "#DetailPlace_uc_goldprices1_lblBLSell",
    lastUpdate: "#DetailPlace_uc_goldprices1_lblAsTime",
  },
  {
    name: "pricesinfo",
    buy: "#DetailPlace_uc_pricesinfo_lblBLBuy",
    sell: "#DetailPlace_uc_pricesinfo_lblBLSell",
    lastUpdate: "#DetailPlace_uc_pricesinfo_lblLastUpdate",
  },
] as const;

// ── Validation bounds ───────────────────────────────────────────────────
const MIN_VALID_PRICE = 50_000;
const MAX_VALID_PRICE = 100_000;

// ── Retry configuration ─────────────────────────────────────────────────
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 500;

// ── Logging helper ──────────────────────────────────────────────────────
function log(level: "info" | "warn" | "error", message: string) {
  const ts = new Date().toISOString();
  const prefix = `[gold-scraper ${level.toUpperCase()} ${ts}]`;
  if (level === "error") {
    console.error(prefix, message);
  } else if (level === "warn") {
    console.warn(prefix, message);
  } else {
    console.log(prefix, message);
  }
}

/**
 * Parse a Thai-formatted price string like "72,100.00" or "72,100" into
 * an integer. Returns NaN if the input cannot be parsed.
 */
function parsePrice(raw: string): number {
  const cleaned = raw.replace(/,/g, "").trim();
  const value = parseFloat(cleaned);
  return Math.round(value);
}

/**
 * Validate that a price falls within the expected range for Thai gold bar
 * prices (50,000–100,000 THB per baht-weight).
 */
function isValidPrice(value: number): boolean {
  return !isNaN(value) && value >= MIN_VALID_PRICE && value <= MAX_VALID_PRICE;
}

function formatThaiDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString("th-TH", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Delay helper for retries */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Attempt to extract gold prices from a parsed Cheerio document.
 * Iterates through SELECTOR_SETS until one yields valid data.
 */
function extractPrices($: cheerio.CheerioAPI): GoldPriceRaw {
  for (const selectors of SELECTOR_SETS) {
    const buyText = $(selectors.buy).text().trim();
    const sellText = $(selectors.sell).text().trim();
    const lastUpdateText = $(selectors.lastUpdate).text().trim();

    // Skip this selector set if either price is missing
    if (!buyText || !sellText) {
      log("warn", `Selector set "${selectors.name}" returned empty: buy="${buyText}", sell="${sellText}"`);
      continue;
    }

    const buy = parsePrice(buyText);
    const sell = parsePrice(sellText);

    if (!isValidPrice(buy)) {
      log("warn", `Selector "${selectors.name}" buy price invalid: ${buy} (raw: "${buyText}")`);
      continue;
    }

    if (!isValidPrice(sell)) {
      log("warn", `Selector "${selectors.name}" sell price invalid: ${sell} (raw: "${sellText}")`);
      continue;
    }

    log("info", `Extracted via "${selectors.name}": buy=${buy}, sell=${sell}`);

    return {
      buy,
      sell,
      updatedAt: lastUpdateText || new Date().toISOString(),
    };
  }

  throw new Error(
    "All selector sets failed to extract valid prices"
  );
}

/**
 * Single scrape attempt — fetches the page and extracts prices.
 */
async function fetchLatestFromApi(): Promise<GoldPriceRaw> {
  const { data } = await axios.get(GOLD_API_URL, {
    headers: {
      Accept: "application/json",
      "User-Agent": "Mozilla/5.0",
    },
    timeout: 10_000,
  });

  const buy = Math.round(Number(data?.bL_BuyPrice));
  const sell = Math.round(Number(data?.bL_SellPrice));

  if (!isValidPrice(buy) || !isValidPrice(sell)) {
    throw new Error("Gold API returned invalid prices");
  }

  return {
    buy,
    sell,
    updatedAt: data?.asTime ? formatThaiDateTime(data.asTime) : new Date().toISOString(),
  };
}

async function scrapeClassicPage(): Promise<GoldPriceRaw> {
  const { data: html } = await axios.get(CLASSIC_GOLD_URL, {
    headers: {
      Accept: "text/html",
      "User-Agent": "Mozilla/5.0",
    },
    timeout: 10_000,
  });

  const $ = cheerio.load(html);
  return extractPrices($);
}

async function scrapeOnce(): Promise<GoldPriceRaw> {
  try {
    return await fetchLatestFromApi();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    log("warn", `Gold API failed, falling back to classic page: ${message}`);
    return scrapeClassicPage();
  }
}

/**
 * Scrape gold prices with automatic retry (up to MAX_RETRIES attempts,
 * RETRY_DELAY_MS between each). Throws the last error if all retries fail.
 */
export async function scrapeGoldPrice(): Promise<GoldPriceRaw> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const result = await scrapeOnce();
      if (attempt > 1) {
        log("info", `Scrape succeeded on retry attempt ${attempt}`);
      } else {
        log("info", `Scrape succeeded on first attempt`);
      }
      return result;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      log("warn", `Attempt ${attempt}/${MAX_RETRIES} failed: ${lastError.message}`);

      if (attempt < MAX_RETRIES) {
        await delay(RETRY_DELAY_MS);
      }
    }
  }

  throw lastError ?? new Error("Scrape failed after all retries");
}
