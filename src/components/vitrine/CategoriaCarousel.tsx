"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { IconeCategoria } from "./icones-categoria";

type Categoria = { id: string; nome: string };

// Identidade "Leroy Merlin" (DESIGN.md 2026-07-29): cada card de categoria usa
// uma cor do sistema em rodízio determinístico pelo índice — não há campo de
// "cor da categoria" no schema, então não inventamos um; o rodízio é decoração.
const CORES = ["bg-lm-azul", "bg-lm-marinho", "bg-lm-vermelho", "bg-lm-amarelo"] as const;

const TEXTO_ESCURO = new Set(["bg-lm-amarelo"]);

const LARGURA_CARD = 148 + 12; // max-w do card + gap — usado no passo do scroll

export function CategoriaCarousel({ categorias }: { categorias: Categoria[] }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const ultimaInteracao = useRef(0);

  function rolar(direcao: -1 | 1) {
    ultimaInteracao.current = Date.now();
    trackRef.current?.scrollBy({ left: direcao * 330, behavior: "smooth" });
  }

  // Auto-avanço: "ícones girando" — pausa 4s depois de qualquer interação
  // manual (clique nas setas ou arrastar no touch), respeita
  // prefers-reduced-motion.
  useEffect(() => {
    if (categorias.length < 3) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const track = trackRef.current;
    if (!track) return;

    function aoInteragir() {
      ultimaInteracao.current = Date.now();
    }
    track.addEventListener("touchstart", aoInteragir, { passive: true });

    const id = setInterval(() => {
      if (Date.now() - ultimaInteracao.current < 4000) return;
      const fimDoScroll = track.scrollWidth - track.clientWidth - 4;
      if (track.scrollLeft >= fimDoScroll) {
        track.scrollTo({ left: 0, behavior: "smooth" });
      } else {
        track.scrollBy({ left: LARGURA_CARD, behavior: "smooth" });
      }
    }, 3000);

    return () => {
      clearInterval(id);
      track.removeEventListener("touchstart", aoInteragir);
    };
  }, [categorias.length]);

  if (categorias.length === 0) {
    return <p className="text-sm text-[#7C7C7C]">Nenhuma categoria disponível ainda.</p>;
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => rolar(-1)}
        aria-label="Categorias anteriores"
        className="absolute -left-4 top-[52px] z-10 hidden h-9 w-9 items-center justify-center rounded-full border border-line bg-white shadow-[0_6px_14px_rgba(16,39,57,.12)] hover:bg-lm-cinza sm:flex"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden>
          <path d="M15 5l-7 7 7 7" />
        </svg>
      </button>

      <div
        ref={trackRef}
        className="flex gap-3 overflow-x-auto pb-1.5 pt-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        style={{ scrollSnapType: "x mandatory" }}
      >
        {categorias.map((cat, i) => {
          const cor = CORES[i % CORES.length];
          const escuro = TEXTO_ESCURO.has(cor);
          return (
            <Link
              key={cat.id}
              href={`/categoria/${cat.id}`}
              className="flex w-[27vw] min-w-[104px] max-w-[148px] shrink-0 flex-col"
              style={{ scrollSnapAlign: "start" }}
            >
              <div className={`relative flex h-[92px] items-center justify-center overflow-hidden rounded-[12px_12px_4px_4px] ${cor}`}>
                <IconeCategoria
                  nome={cat.nome}
                  className={`absolute -bottom-2 -right-2 h-14 w-14 opacity-25 ${escuro ? "text-lm-marinho" : "text-white"}`}
                />
                <span
                  className={`relative px-3 text-center text-[13px] font-semibold leading-tight ${
                    escuro ? "text-lm-marinho" : "text-white"
                  }`}
                >
                  {cat.nome}
                </span>
              </div>
              <span className="pt-1 text-center text-[12.5px] font-extrabold leading-tight text-ink">
                {cat.nome}
              </span>
            </Link>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => rolar(1)}
        aria-label="Próximas categorias"
        className="absolute -right-4 top-[52px] z-10 hidden h-9 w-9 items-center justify-center rounded-full border border-line bg-white shadow-[0_6px_14px_rgba(16,39,57,.12)] hover:bg-lm-cinza sm:flex"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden>
          <path d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  );
}
