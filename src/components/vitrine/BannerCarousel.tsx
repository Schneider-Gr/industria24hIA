"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

export type BannerSlide = {
  src: string;
  srcMobile?: string;
  alt: string;
  href?: string;
};

/**
 * Hero full-bleed: sangra de borda a borda da viewport (sem max-w-[1280px]).
 * Autoplay 6s, pausa no hover/foco e respeita prefers-reduced-motion.
 */
export function BannerCarousel({ slides }: { slides: BannerSlide[] }) {
  const [slide, setSlide] = useState(0);
  const [pausado, setPausado] = useState(false);
  const total = slides.length;
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (total < 2 || pausado) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => setSlide((s) => (s + 1) % total), 6000);
    return () => clearInterval(t);
  }, [total, pausado]);

  if (total === 0) return null;

  const atual = slides[slide];
  const imagem = (
    <picture className="block h-full w-full">
      {atual.srcMobile && <source media="(max-width: 640px)" srcSet={atual.srcMobile} />}
      <img src={atual.src} alt={atual.alt} className="h-full w-full object-cover" />
    </picture>
  );

  return (
    <div
      ref={ref}
      className="relative w-full overflow-hidden bg-aco-900"
      onMouseEnter={() => setPausado(true)}
      onMouseLeave={() => setPausado(false)}
      onFocusCapture={() => setPausado(true)}
      onBlurCapture={() => setPausado(false)}
    >
      <div className="aspect-[4/3] w-full sm:aspect-[21/9]">
        {atual.href ? (
          <Link href={atual.href} className="block h-full w-full">
            {imagem}
          </Link>
        ) : (
          imagem
        )}
      </div>

      {total > 1 && (
        <>
          <button
            type="button"
            aria-label="Slide anterior"
            onClick={() => setSlide((s) => (s - 1 + total) % total)}
            className="absolute left-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/20 text-sm text-white transition-colors hover:bg-black/40"
          >
            ‹
          </button>
          <button
            type="button"
            aria-label="Próximo slide"
            onClick={() => setSlide((s) => (s + 1) % total)}
            className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/20 text-sm text-white transition-colors hover:bg-black/40"
          >
            ›
          </button>
          <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
            {slides.map((s, i) => (
              <button
                key={s.src}
                type="button"
                aria-label={`Ir para o slide ${i + 1}`}
                aria-current={i === slide}
                onClick={() => setSlide(i)}
                className={`h-1.5 w-1.5 rounded-full transition-colors ${
                  i === slide ? "bg-white" : "bg-white/50"
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
