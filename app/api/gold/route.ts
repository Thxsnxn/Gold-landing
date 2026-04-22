import { NextResponse } from "next/server";
import { scrapeGoldPrice } from "@/lib/scrapeGold";
import { getGoldPriceCached } from "@/lib/goldCache";
import { getConfig } from "@/lib/configStore";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { data, fromFallback } = await getGoldPriceCached(scrapeGoldPrice);
    const config = getConfig();

    let ornament = Math.floor(data.buy * 0.95) - config.ornament_offset;
    // ปัดเศษให้ลงท้ายด้วยหลักร้อย (ถ้าน้อยกว่า 50 ปัดลง, ถ้า 50 ขึ้นไป ปัดขึ้น)
    ornament = Math.round(ornament / 100) * 100;

    return NextResponse.json({
      success: true,
      buy: data.buy,
      sell: data.sell,
      ornament,
      updatedAt: data.updatedAt,
      ...(fromFallback && { stale: true }),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error("[gold-api ERROR]", message);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}