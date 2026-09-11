"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { IconeCategoria } from "@/components/vitrine/icones-categoria";

type Categoria = { id: string; nome: string };

// Chips de categoria no topo mobile da home (benchmark Zé Delivery, change
// mobile-vitrine-densa-benchmark): o primeiro chip abre o painel inferior com
// todas as categorias em grade; os seguintes vão direto para a categoria. Só
// entram categorias com produto no CEP do comprador (a home filtra antes).
// O painel sai por portal no body: dentro do header (sticky z-40, que abre
// stacking context) ele ficaria atrás da tab bar e do FAB.
export function ChipsCategorias({ categorias }: { categorias: Categoria[] }) {
  const [aberto, setAberto] = useState(false);
  const fecharRef = useRef<HTMLButtonElement>(null);
  const gatilhoRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!aberto) return;
    fecharRef.current?.focus();
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAberto(false);
    };
    document.addEventListener("keydown", aoTeclar);
    const overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const gatilho = gatilhoRef.current;
    return () => {
      document.removeEventListener("keydown", aoTeclar);
      document.body.style.overflow = overflowAnterior;
      gatilho?.focus();
    };
  }, [aberto]);

  if (categorias.length === 0) return null;

  return (
    <>
      <nav aria-label="Categorias com produto no seu CEP" className="scroll-chips -mx-4 flex gap-2 overflow-x-auto px-4 pb-2">
        <button
          ref={gatilhoRef}
          type="button"
          onClick={() => setAberto(true)}
          aria-haspopup="dialog"
          className="flex min-h-9 shrink-0 items-center gap-1.5 rounded-full bg-white px-3.5 text-[13px] font-semibold text-lm-marinho"
        >
          <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" aria-hidden>
            <rect x="3" y="3" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.8" />
            <rect x="11" y="3" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.8" />
            <rect x="3" y="11" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.8" />
            <rect x="11" y="11" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.8" />
          </svg>
          Categorias
        </button>
        {categorias.map((c) => (
          <Link
            key={c.id}
            href={`/categoria/${c.id}`}
            className="flex min-h-9 shrink-0 items-center rounded-full bg-white/10 px-3.5 text-[13px] font-semibold text-white/90 transition-colors hover:bg-white/20"
          >
            {c.nome}
          </Link>
        ))}
      </nav>

      {aberto &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="titulo-sheet-categorias"
            className="fixed inset-0 z-[60] flex items-end bg-black/50"
            onClick={() => setAberto(false)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="max-h-[80vh] w-full overflow-y-auto rounded-t-2xl bg-surface px-4 pt-2"
              style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom))" }}
            >
              <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-line" aria-hidden />
              <div className="mb-3 flex items-center justify-between">
                <h2 id="titulo-sheet-categorias" className="font-display text-xl font-semibold tracking-[-0.015em] text-ink">
                  Categorias
                </h2>
                <button
                  ref={fecharRef}
                  type="button"
                  onClick={() => setAberto(false)}
                  aria-label="Fechar categorias"
                  className="flex h-11 w-11 items-center justify-center rounded-full text-ink-2 hover:bg-lm-cinza"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
                    <path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
              <ul className="grid grid-cols-2 gap-3">
                {categorias.map((c) => (
                  <li key={c.id}>
                    <Link
                      href={`/categoria/${c.id}`}
                      onClick={() => setAberto(false)}
                      className="flex h-24 flex-col justify-between rounded-[10px] bg-lm-cinza p-3 text-[14px] font-semibold leading-tight text-ink"
                    >
                      {c.nome}
                      <IconeCategoria nome={c.nome} className="h-8 w-8 self-end text-lm-azul" />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
