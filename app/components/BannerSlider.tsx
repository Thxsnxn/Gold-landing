"use client";

import { useEffect, useState, useCallback } from "react";

interface BannerSliderProps {
  banners: string[];
  interval?: number;
}

export default function BannerSlider({
  banners,
  interval = 3000,
}: BannerSliderProps) {
  const [current, setCurrent] = useState(0);
  const [activeBanners, setActiveBanners] = useState(banners);
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    setActiveBanners(banners);
    setCurrent(0);
  }, [banners]);

  const goTo = useCallback(
    (index: number) => {
      if (index === current || isTransitioning) return;
      setIsTransitioning(true);
      setCurrent(index);
      setTimeout(() => setIsTransitioning(false), 800);
    },
    [current, isTransitioning]
  );

  useEffect(() => {
    if (activeBanners.length <= 1) return;

    const timer = setInterval(() => {
      setCurrent((prev) => {
        const next = (prev + 1) % activeBanners.length;
        setIsTransitioning(true);
        setTimeout(() => setIsTransitioning(false), 800);
        return next;
      });
    }, interval);

    return () => clearInterval(timer);
  }, [activeBanners.length, interval]);

  useEffect(() => {
    if (current >= activeBanners.length) {
      setCurrent(0);
    }
  }, [activeBanners.length, current]);

  if (activeBanners.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div
          className="text-center"
          style={{
            background:
              "linear-gradient(135deg, var(--dark-800), var(--dark-700))",
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <p className="text-gray-500 text-sm">ยังไม่มีแบนเนอร์</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full overflow-hidden bg-black">
      {/* Images */}
      {activeBanners.map((src, i) => (
        <img
          key={src}
          src={src}
          alt={`Banner ${i + 1}`}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-800 ease-in-out ${i === current ? "opacity-100 banner-fade-in" : "opacity-0"
            }`}
          style={{ zIndex: i === current ? 1 : 0 }}
          onError={() => {
            setActiveBanners((items) => items.filter((item) => item !== src));
          }}
        />
      ))}

      {/* Gradient overlay at bottom for readability */}
      <div
        className="absolute bottom-0 left-0 right-0 h-24 z-10"
        style={{
          background:
            "linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 100%)",
        }}
      />

      {/* Dot indicators */}
      {activeBanners.length > 1 && (
        <div
          className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-20"
          id="banner-dots"
        >
          {activeBanners.map((_, i) => (
            <button
              key={i}
              className={`dot-indicator ${i === current ? "active" : ""}`}
              onClick={() => goTo(i)}
              aria-label={`Go to banner ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
