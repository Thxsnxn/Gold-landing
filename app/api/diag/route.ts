import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 20;

const API = "https://goldtraders.or.th/api/GoldPrices/Latest?readjson=false";
const HOME = "https://goldtraders.or.th/";

async function attempt(label: string, url: string, headers: Record<string, string>) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8_000);
  const started = Date.now();
  try {
    const res = await fetch(url, { headers, signal: controller.signal });
    const text = await res.text();
    return {
      label,
      status: res.status,
      ok: res.ok,
      ms: Date.now() - started,
      bytes: text.length,
      snippet: text.slice(0, 200),
    };
  } catch (e) {
    return {
      label,
      error: e instanceof Error ? e.message : String(e),
      ms: Date.now() - started,
    };
  } finally {
    clearTimeout(timer);
  }
}

export async function GET() {
  const browserHeaders = {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    Accept: "application/json, text/plain, */*",
    "Accept-Language": "th-TH,th;q=0.9,en;q=0.8",
    Referer: "https://goldtraders.or.th/",
    Origin: "https://goldtraders.or.th",
  };

  const results = await Promise.all([
    attempt("api_bare", API, { "User-Agent": "Mozilla/5.0" }),
    attempt("api_browser_headers", API, browserHeaders),
    attempt("api_no_origin", API, {
      "User-Agent": browserHeaders["User-Agent"],
      Accept: browserHeaders.Accept,
      Referer: "https://goldtraders.or.th/",
    }),
    attempt("homepage", HOME, { "User-Agent": browserHeaders["User-Agent"] }),
  ]);

  return NextResponse.json(
    { region: process.env.VERCEL_REGION ?? "unknown", results },
    { headers: { "cache-control": "no-store" } }
  );
}
