import axios from "axios";
import * as cheerio from "cheerio";
import type { GoldPriceRaw } from "./types";

const CLASSIC_HOME_URL = "https://classic.goldtraders.or.th/";
const CLASSIC_DEFAULT_URL = "https://classic.goldtraders.or.th/default.aspx";
const CLASSIC_DAILY_URL = "https://classic.goldtraders.or.th/DailyPrices.aspx";
const CLASSIC_UPDATE_URL = "https://classic.goldtraders.or.th/UpdatePriceList.aspx";

const MIN_VALID_PRICE = 50_000;
const MAX_VALID_PRICE = 100_000;
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 500;
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

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeText(html: string): string {
  const $ = cheerio.load(html);
  return $("body")
    .text()
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseThaiPrice(value: string): number {
  return Math.round(Number(value.replace(/,/g, "")));
}

function buildResult(buyRaw: string, sellRaw: string, updatedAt: string): GoldPriceRaw {
  const buy = parseThaiPrice(buyRaw);
  const sell = parseThaiPrice(sellRaw);

  if (!isValidPrice(buy) || !isValidPrice(sell)) {
    throw new Error("classic.goldtraders.or.th returned invalid prices");
  }

  return {
    buy,
    sell,
    updatedAt,
  };
}

function parseHomePage(html: string): GoldPriceRaw {
  const text = normalizeText(html);
  const match = text.match(
    /ประจำวันที่\s*([0-9/]+)\s*เวลา\s*([0-9:.]+)\s*น\.\s*\(ครั้งที่\s*\d+\)\s*บาทละ\(บาท\)\s*ทองคำแท่ง 96\.5%\s*ขายออก\s*([\d,]+\.\d+)\s*รับซื้อ\s*([\d,]+\.\d+)/
  );

  if (!match) {
    throw new Error("classic home page format changed");
  }

  const [, date, time, sellRaw, buyRaw] = match;
  return buildResult(buyRaw, sellRaw, `${date} ${time}`);
}

function parseDailyPricePage(html: string): GoldPriceRaw {
  const text = normalizeText(html);
  const match = text.match(
    /ราคาทองตามประกาศของสมาคมค้าทองคำ\s*ประจำวันที่\s*([0-9/]+)[\s\S]*?ทองคำแท่ง 96\.5%\s*n\/a\s*([\d,]+\.\d+)\s*([\d,]+\.\d+)/
  );

  if (!match) {
    throw new Error("classic daily page format changed");
  }

  const [, date, buyRaw, sellRaw] = match;
  return buildResult(buyRaw, sellRaw, date);
}

function parseUpdatePriceTime(html: string): string | null {
  const text = normalizeText(html);
  const match = text.match(
    /([0-9]{2}\/[0-9]{2}\/[0-9]{4})\s+([0-9]{2}:[0-9]{2})\s+\d+\s+[\d,]+\.\d+\s+[\d,]+\.\d+/
  );

  if (!match) {
    return null;
  }

  return `${match[1]} ${match[2]}`;
}

async function fetchHtml(url: string): Promise<string> {
  const { data } = await axios.get<string>(url, {
    headers: {
      Accept: "text/html,application/xhtml+xml",
      "Cache-Control": "no-cache",
      Pragma: "no-cache",
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36",
    },
    responseType: "text",
    timeout: REQUEST_TIMEOUT_MS,
  });

  return data;
}

async function tryParseCurrentPage(url: string): Promise<GoldPriceRaw> {
  const html = await fetchHtml(url);
  return parseHomePage(html);
}

async function tryParseDailyPage(): Promise<GoldPriceRaw> {
  const [dailyHtml, updateHtml] = await Promise.all([
    fetchHtml(CLASSIC_DAILY_URL),
    fetchHtml(CLASSIC_UPDATE_URL).catch((err) => {
      const message = err instanceof Error ? err.message : String(err);
      log("warn", `Update page unavailable, using daily page date only: ${message}`);
      return null;
    }),
  ]);

  const dailyPrice = parseDailyPricePage(dailyHtml);
  const latestUpdate = updateHtml ? parseUpdatePriceTime(updateHtml) : null;

  return {
    ...dailyPrice,
    updatedAt: latestUpdate ?? dailyPrice.updatedAt,
  };
}

async function scrapeOnce(): Promise<GoldPriceRaw> {
  const strategies: Array<() => Promise<GoldPriceRaw>> = [
    () => tryParseCurrentPage(CLASSIC_HOME_URL),
    () => tryParseCurrentPage(CLASSIC_DEFAULT_URL),
    () => tryParseDailyPage(),
  ];

  let lastError: Error | null = null;

  for (const strategy of strategies) {
    try {
      return await strategy();
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      log("warn", `Source strategy failed: ${lastError.message}`);
    }
  }

  throw lastError ?? new Error("No scrape strategy succeeded");
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
