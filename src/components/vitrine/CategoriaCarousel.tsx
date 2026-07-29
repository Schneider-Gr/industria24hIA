"use client";

import Link from "next/link";
import { useRef } from "react";

type Categoria = { id: string; nome: string };

// Aurora Industrial (DESIGN.md 2026-07-29): cada card de categoria usa uma cor
// do sistema em rodízio determinístico pelo índice — não há campo de "cor da
// categoria" no schema, então não inventamos um; o rodízio é decoração pura.
const CORES = [
  "bg-red-signal",
  "bg-purple-royal",
  "bg-green-fresh",
  "bg-yellow-worker",
  "bg-purple-deep",
  "bg-teal-hero",
] as const;

const TEXTO_ESCURO = new Set(["bg-yellow-worker"]);

export function CategoriaCarousel({ categorias }: { categorias: Categoria[] }) {
  const trackRef = useRef<HTMLDivElement>(null);

  function rolar(direcao: -1 | 1) {
    trackRef.current?.scrollBy({ left: direcao * 330, behavior: "smooth" });
  }

  if (categorias.length === 0) {
    return <p className="text-sm text-[#7C7C7C]">Nenhuma categoria disponível ainda.</p>;
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => rolar(-1)}
        aria-label="Categorias anteriores"
        className="absolute -left-4 top-[52px] z-10 hidden h-9 w-9 items-center justify-center rounded-full border border-line bg-white shadow-[0_6px_14px_rgba(28,20,36,.12)] hover:bg-purple-soft sm:flex"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden>
          <path d="M15 5l-7 7 7 7" />
        </svg>
      </button>

      <div
        ref={trackRef}
        className="flex gap-3.5 overflow-x-auto pb-2 pt-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
        style={{ scrollSnapType: "x mandatory" }}
      >
        {categorias.map((cat, i) => {
          const cor = CORES[i % CORES.length];
          const escuro = TEXTO_ESCURO.has(cor);
          return (
            <Link
              key={cat.id}
              href={`/categoria/${cat.id}`}
              className="flex w-[148px] shrink-0 flex-col"
              style={{ scrollSnapAlign: "start" }}
            >
              <div className={`flex h-[92px] items-center justify-center rounded-[12px_12px_4px_4px] ${cor}`}>
                <span
                  className={`px-3 text-center text-[13px] font-semibold leading-tight ${
                    escuro ? "text-maroon-hero" : "text-white"
                  }`}
                >
                  {cat.nome}
                </span>
              </div>
              <span className="pt-2 text-center text-[12.5px] font-semibold leading-tight text-ink">
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
        className="absolute -right-4 top-[52px] z-10 hidden h-9 w-9 items-center justify-center rounded-full border border-line bg-white shadow-[0_6px_14px_rgba(28,20,36,.12)] hover:bg-purple-soft sm:flex"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden>
          <path d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  );
}
