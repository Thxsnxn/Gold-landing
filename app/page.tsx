"use client";

import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import BannerSlider from "./components/BannerSlider";

const STATIC_BANNERS = [
  "/uploads/banner1.png",
  "/uploads/banner2.png",
  "/uploads/banner3.png",
  "/uploads/banner4.png",
  "/uploads/banner5.png",
  "/uploads/banner6.png",
  "/uploads/banner7.png",
  "/uploads/banner8.png",
  "/uploads/banner9.png",
  "/uploads/banner10.png",
];

interface GoldData {
  buy: number;
  sell: number;
  ornament: number;
  updatedAt: string;
}

export default function Home() {
  const [gold, setGold] = useState<GoldData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchGold = async () => {
    try {
      const res = await fetch("/api/gold");
      const data = await res.json();

      if (data.success) {
        setGold(data);
        setError(null);
      } else {
        setError(data.error || "ไม่สามารถโหลดราคาทองได้");
      }
    } catch {
      setError("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGold();

    const interval = setInterval(fetchGold, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex w-full h-screen bg-black" style={{ backgroundColor: 'black' }}>
      {/* LEFT */}
      <div className="w-full lg:w-1/2 h-full flex flex-col overflow-hidden">

        {/* HEADER */}
        <div className="bg-[#f5f2ed] w-fullflex items-center px-6 py-5 border-b-4 border-[#c40000]" style={{ backgroundColor: '#f5f2ed', borderBottomColor: '#c40000' }}>
          <div className="flex justify-around w-full  items-center">

            <div className="w-[95px] h-[95px] rounded-full  overflow-hidden shadow-md">
              <img src="/logo/logo1.jpg" className="w-full h-full object-cover" />
            </div>

            <div className="text-center grid gap-0">
              <h1
                className="text-[#BD230D] leading-tight h-[100px]  lg:text-[clamp(90px,5vw,72px)]"
                
              >
                ราคาทองแท่งวันนี้
              </h1>

              <p className="text-[#555] -mt-1 text-[clamp(30px,1.2vw,16px)] font-light flex items-center justify-center gap-2" style={{ color: '#555' }}>
                {gold ? (
                  <>
                    ข้อมูลล่าสุด {gold.updatedAt}
                    
                  </>
                ) : (
                  "กำลังโหลด..."
                )}
              </p>
            </div>

            <div className="w-[95px] h-[95px] rounded-full overflow-hidden shadow-md">
              <img src="/logo/logo2.jpg" className="w-full h-full object-cover" />
            </div>

          </div>
        </div>

        {/* CONTENT */}
        {loading ? (
          <div className="flex-1 flex flex-col">
            <div className="flex-1 bg-[#BD230D] animate-pulse" />
            <div className="flex-1 bg-[#BD230D] animate-pulse" />
            <div className="flex-1 bg-[#FDD671] animate-pulse" />
          </div>
        ) : error ? (
          <div className="flex-1 bg-[#BD230D] flex flex-col items-center justify-center text-white" style={{ backgroundColor: '#BD230D', color: 'white' }}>
            <p className="mb-4 text-xl font-bold">{error}</p>
            <button
              onClick={() => {
                setLoading(true);
                fetchGold();
              }}
              className="flex items-center gap-2 bg-white text-[#BD230D] px-6 py-3 rounded-full font-bold"
            >
              <RefreshCw size={20} />
              ลองใหม่
            </button>
          </div>
        ) : gold && (
          <div className="flex flex-col w-full h-full">

            {/* RED SECTION - BUY & SELL */}
            <div className="flex-[3] flex flex-col  justify-center  bg-[#BD230D] text-white overflow-hidden" style={{ backgroundColor: '#BD230D', color: 'white' }}>
              {/* BUY */}
              <div className="flex-1 flex  justify-between  w-full items-center px-8  overflow-hidden">
                <div className="flex items-center mx-10  h-[100px] justify-around text-center text-[clamp(13vh,4vw,56px)] font-medium" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.3)' }}>
                  
                  <div className="h-[120px] ">​​​รับซื้อ​​</div>
                 
                </div>
                <div className="flex items-center h-[100px]  whitespace-nowrap overflow-hidden font-medium tabular-nums text-[clamp(21vh,6vw,80px)] [font-feature-settings:'tnum']">
                  {gold.buy.toLocaleString("th-TH")}
                </div>
              </div>

              {/* SELL */}
              <div className="flex-1 flex justify-between w-full items-center  px-8  overflow-hidden">
                <div className="flex items-center justify-around text-center h-[100px] text-[clamp(13vh,4vw,56px)] font-medium" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.3)' }}>
                  ขายออก
                </div>
                <div className="flex justify-between whitespace-nowrap items-center h-[100px] overflow-hidden font-medium tabular-nums text-[clamp(21vh,6vw,80px)] [font-feature-settings:'tnum']">
                  {gold.sell.toLocaleString("th-TH")}
                </div>
              </div>
            </div>

            {/* YELLOW SECTION - ORNAMENT */}
            <div className="flex-[2] flex justify-between w-full items-center px-8 h-[300px] bg-[#FDD671] text-black min-h-0 overflow-hidden" style={{ backgroundColor: '#FDD671', color: 'black' }}>
              <div className="flex flex-col items-center justify-center text-center leading-tight text-[clamp(11vh,4vw,56px)] font-medium">
                <span className="h-[60px]">รับซื้อ</span>
                <span className="h-[60px]">รูปพรรณ</span>
              </div>
              <div className="flex justify-around whitespace-nowrap items-center h-[150px] overflow-hidden font-medium tabular-nums text-[clamp(21vh,6vw,80px)] [font-feature-settings:'tnum']">
                {gold.ornament.toLocaleString("th-TH")}
              </div>
            </div>

          </div>
        )}
      </div>

      {/* RIGHT */}
      <div className="hidden lg:block lg:w-1/2 h-full">
        <BannerSlider banners={STATIC_BANNERS} interval={20000} />
      </div>
    </div>
  );
}
