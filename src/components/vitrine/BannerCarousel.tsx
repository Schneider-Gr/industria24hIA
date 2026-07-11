"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

// Réplica do carrossel de 2 slides da home real (banner-principal + CTA
// "Compre do Mercado Futuro" apontando para a seção #mercado-futuro).
export function BannerCarousel({
  bannerUrl,
  bannerMobileUrl,
}: {
  bannerUrl: string;
  bannerMobileUrl: string;
}) {
  const [slide, setSlide] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setSlide((s) => (s + 1) % 2), 6000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="relative overflow-hidden rounded-md">
      {slide === 0 ? (
        <picture className="block">
          <source media="(max-width: 640px)" srcSet={bannerMobileUrl} />
          <img src={bannerUrl} alt="Indústria 24h" className="w-full object-cover" />
        </picture>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 bg-[#1a1420]">
          <div className="flex flex-col justify-center gap-4 p-6 sm:p-10">
            <h2 className="font-display text-[32px] font-extrabold leading-[1.05] text-white sm:text-[40px]">
              Compre
              <br />
              do Mercado
              <br />
              Futuro
            </h2>
            <p className="max-w-[320px] text-sm text-white/80 sm:text-base">
              Aproveite os descontos e tenha mais lucro
            </p>
            <Link
              href="#mercado-futuro"
              className="inline-flex w-fit items-center rounded-sm bg-info px-6 py-2.5 text-xs font-bold uppercase tracking-wider text-white hover:brightness-110"
            >
              Saiba mais
            </Link>
          </div>
          <img
            src="/banners/banner-3.jpg"
            alt="Compre do Mercado Futuro"
            className="hidden h-full w-full object-cover sm:block"
          />
        </div>
      )}

      <button
        type="button"
        aria-label="Slide anterior"
        onClick={() => setSlide((s) => (s + 1) % 2)}
        className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/20 p-2 text-white hover:bg-black/40"
      >
        ‹
      </button>
      <button
        type="button"
        aria-label="Próximo slide"
        onClick={() => setSlide((s) => (s + 1) % 2)}
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/20 p-2 text-white hover:bg-black/40"
      >
        ›
      </button>
      <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1.5">
        {[0, 1].map((i) => (
          <span
            key={i}
            className={`h-1.5 w-1.5 rounded-full ${i === slide ? "bg-info" : "bg-white/50"}`}
          />
        ))}
      </div>
    </div>
  );
}
