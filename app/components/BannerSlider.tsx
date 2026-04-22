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
  const [isTransitioning, setIsTransitioning] = useState(false);

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
    if (banners.length <= 1) return;

    const timer = setInterval(() => {
      setCurrent((prev) => {
        const next = (prev + 1) % banners.length;
        setIsTransitioning(true);
        setTimeout(() => setIsTransitioning(false), 800);
        return next;
      });
    }, interval);

    return () => clearInterval(timer);
  }, [banners.length, interval]);

  if (banners.length === 0) {
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
      {banners.map((src, i) => (
        <img
          key={src}
          src={src}
          alt={`Banner ${i + 1}`}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-800 ease-in-out ${i === current ? "opacity-100 banner-fade-in" : "opacity-0"
            }`}
          style={{ zIndex: i === current ? 1 : 0 }}
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
      {banners.length > 1 && (
        <div
          className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-20"
          id="banner-dots"
        >
          {banners.map((_, i) => (
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
