import axios from "axios";
import type { GoldPriceRaw } from "./types";

const GOLD_TRADERS_API_URL =
  "https://goldtraders.or.th/api/GoldPrices/Latest?readjson=false";

const MIN_VALID_PRICE = 50_000;
const MAX_VALID_PRICE = 100_000;
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 500;
// Keep total time (retries × timeout + delays) under Vercel's function limit.
// Default region is overseas, so allow a bit more time per request.
const REQUEST_TIMEOUT_MS = 6_000;

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

function isValidPrice(value: number): boolean {
  return !Number.isNaN(value) && value >= MIN_VALID_PRICE && value <= MAX_VALID_PRICE;
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

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchLatestFromGoldTraders(): Promise<GoldPriceRaw> {
  const { data } = await axios.get(GOLD_TRADERS_API_URL, {
    headers: {
      Accept: "application/json",
      "User-Agent": "Mozilla/5.0",
    },
    timeout: REQUEST_TIMEOUT_MS,
  });

  const buy = Math.round(Number(data?.bL_BuyPrice));
  const sell = Math.round(Number(data?.bL_SellPrice));

  if (!isValidPrice(buy) || !isValidPrice(sell)) {
    throw new Error("goldtraders.or.th returned invalid prices");
  }

  return {
    buy,
    sell,
    updatedAt: data?.asTime
      ? formatThaiDateTime(data.asTime)
      : new Date().toISOString(),
  };
}

async function scrapeOnce(): Promise<GoldPriceRaw> {
  return fetchLatestFromGoldTraders();
}

export async function scrapeGoldPrice(): Promise<GoldPriceRaw> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const result = await scrapeOnce();
      if (attempt > 1) {
        log("info", `Scrape succeeded on retry attempt ${attempt}`);
      } else {
        log("info", "Scrape succeeded on first attempt");
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
