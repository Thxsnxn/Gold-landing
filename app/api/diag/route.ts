import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 20;

const URLS = [
  "https://classic.goldtraders.or.th/default.aspx",
  "https://classic.goldtraders.or.th/DailyPrices.aspx",
  "https://goldtraders.or.th/api/GoldPrices/Latest?readjson=true",
];

async function attempt(url: string) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 9_000);
  const started = Date.now();
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36",
        Accept: "text/html,application/json,*/*",
      },
      signal: controller.signal,
    });
    const buf = await res.arrayBuffer();
    const text = Buffer.from(buf).toString("latin1");
    return {
      url,
      status: res.status,
      bytes: buf.byteLength,
      isCloudflareChallenge: text.includes("Just a moment"),
      hasPrice: /69,?\d{3}|bL_BuyPrice/.test(text),
    };
  } catch (e) {
    return { url, error: e instanceof Error ? e.message : String(e), ms: Date.now() - started };
  } finally {
    clearTimeout(timer);
  }
}

export async function GET() {
  const results = await Promise.all(URLS.map(attempt));
  return NextResponse.json(
    { region: process.env.VERCEL_REGION ?? "unknown", results },
    { headers: { "cache-control": "no-store" } }
  );
}
