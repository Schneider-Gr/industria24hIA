"use client";

import Link from "next/link";
import { useRef } from "react";

export type CardGaleria = {
  titulo: string;
  img: string;
  href: string;
  badge?: string;
};

/**
 * Faixa de cards promocionais (padrão "Benefícios em entretenimento" do ML).
 * Navegação, não campanha: sem autoplay. Conteúdo vem por props — não há
 * tabela de banners/campanhas no schema.
 */
export function BannerGalerias({
  titulo,
  cards,
  verTodosHref,
}: {
  titulo: string;
  cards: CardGaleria[];
  verTodosHref?: string;
}) {
  const trilhoRef = useRef<HTMLDivElement>(null);

  if (cards.length === 0) return null;

  function rolar(direcao: 1 | -1) {
    const el = trilhoRef.current;
    if (!el) return;
    el.scrollBy({ left: direcao * el.clientWidth * 0.8, behavior: "smooth" });
  }

  return (
    <section className="group mx-auto mt-10 max-w-[1280px] px-4 sm:px-6">
      <div className="mb-3 flex items-baseline justify-between gap-4">
        <h2 className="text-sm font-semibold uppercase tracking-[0.08em] text-ink sm:text-base">
          {titulo}
        </h2>
        {verTodosHref && (
          <Link
            href={verTodosHref}
            className="text-[13px] tracking-[0.04em] text-aco-600 hover:underline"
          >
            Ver todos
          </Link>
        )}
      </div>

      <div className="relative">
        <div
          ref={trilhoRef}
          className="scroll-chips flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2"
        >
          {cards.map((card) => (
            <Link
              key={card.href + card.titulo}
              href={card.href}
              className="relative w-[78%] shrink-0 snap-start overflow-hidden rounded-md sm:w-[48%] lg:w-[calc((100%-1.5rem)/3)]"
            >
              <div className="aspect-[16/9] w-full bg-[#F3F4F6]">
                <img src={card.img} alt="" className="h-full w-full object-cover" />
              </div>
              {card.badge && (
                <span className="absolute right-2 top-2 rounded-sm bg-sinal px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.04em] text-white">
                  {card.badge}
                </span>
              )}
              <span className="absolute bottom-0 left-0 right-0 bg-black/55 p-3 text-sm font-semibold text-white">
                {card.titulo}
              </span>
            </Link>
          ))}
        </div>

        {cards.length > 3 && (
          <>
            <button
              type="button"
              aria-label="Anterior"
              onClick={() => rolar(-1)}
              className="absolute left-1 top-1/2 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/20 text-sm text-white opacity-0 transition-opacity hover:bg-black/40 group-hover:opacity-100 lg:flex"
            >
              ‹
            </button>
            <button
              type="button"
              aria-label="Próximo"
              onClick={() => rolar(1)}
              className="absolute right-1 top-1/2 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/20 text-sm text-white opacity-0 transition-opacity hover:bg-black/40 group-hover:opacity-100 lg:flex"
            >
              ›
            </button>
          </>
        )}
      </div>
    </section>
  );
}
