"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

export type BannerSlide = {
  src: string;
  srcMobile?: string;
  alt: string;
  href?: string;
  /** Botão visível sobre o slide (texto + link), independente do `href`. */
  ctaTexto?: string;
  ctaHref?: string;
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
  // Padrão Mercado Livre: a arte fica inteira e centralizada (object-contain,
  // limitada ao container), e o fundo do slide continua a peça até as bordas
  // da viewport em vez de cortar a imagem.
  const imagem = (
    <picture className="mx-auto block h-full w-auto max-w-[1280px]">
      {atual.srcMobile && <source media="(max-width: 640px)" srcSet={atual.srcMobile} />}
      <img src={atual.src} alt={atual.alt} className="h-full w-full object-contain" />
    </picture>
  );

  return (
    <div
      ref={ref}
      className="relative w-full overflow-hidden bg-lm-marinho"
      onMouseEnter={() => setPausado(true)}
      onMouseLeave={() => setPausado(false)}
      onFocusCapture={() => setPausado(true)}
      onBlurCapture={() => setPausado(false)}
    >
      <div className="relative aspect-[2/1] w-full sm:aspect-[6/1]">
        {atual.href ? (
          <Link href={atual.href} className="block h-full w-full">
            {imagem}
          </Link>
        ) : (
          imagem
        )}
        {atual.ctaTexto && atual.ctaHref && (
          <Link
            href={atual.ctaHref}
            className="absolute bottom-7 left-1/2 z-10 inline-flex -translate-x-1/2 items-center gap-1.5 rounded-md bg-lm-vermelho px-4 py-2 text-[13px] font-bold text-white shadow-[0_6px_18px_rgba(15,26,36,.35)] transition-colors hover:bg-[#9a2320] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:bottom-8 sm:px-5 sm:py-2.5 sm:text-sm"
          >
            {atual.ctaTexto}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden>
              <path d="M5 12h14M13 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
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
