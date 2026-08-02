"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { IconeCategoria } from "./icones-categoria";

type Categoria = {
  id: string;
  nome: string;
  subcategorias: { id: string; nome: string }[];
};

// ponytail: busca só na primeira abertura (o header é usado por página client,
// então não dá pra receber as categorias por prop de server component).
export function MegaMenuCategorias() {
  const [aberto, setAberto] = useState(false);
  const [categorias, setCategorias] = useState<Categoria[] | null>(null);
  const [foco, setFoco] = useState(0);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!aberto || categorias) return;
    fetch("/api/categorias")
      .then((r) => r.json())
      .then((d) => setCategorias(d.categorias ?? []))
      .catch(() => setCategorias([]));
  }, [aberto, categorias]);

  useEffect(() => {
    if (!aberto) return;
    function aoClicarFora(e: MouseEvent) {
      if (!wrapperRef.current?.contains(e.target as Node)) setAberto(false);
    }
    document.addEventListener("mousedown", aoClicarFora);
    return () => document.removeEventListener("mousedown", aoClicarFora);
  }, [aberto]);

  const ativa = categorias?.[foco];

  function aoTeclar(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      setAberto(false);
      return;
    }
    if (!categorias?.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setFoco((f) => (f + 1) % categorias.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setFoco((f) => (f - 1 + categorias.length) % categorias.length);
    }
  }

  return (
    <div ref={wrapperRef} className="relative" onKeyDown={aoTeclar}>
      <button
        type="button"
        aria-expanded={aberto}
        aria-haspopup="true"
        onClick={() => setAberto((a) => !a)}
        className="flex items-center gap-1.5 rounded-sm px-2.5 py-1.5 text-[13px] font-medium tracking-[0.04em] text-white/90 transition-colors hover:bg-white/10 hover:text-white"
      >
        <IconeHamburguer className="h-4 w-4" aberto={aberto} />
        Categorias
        <svg
          width="10"
          height="10"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.6"
          className={`transition-transform ${aberto ? "rotate-180" : ""}`}
          aria-hidden
        >
          <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {/* No mobile o botão fica na borda esquerda da linha 2, então o flyout
          ancorado em left-0 cabe na viewport inteira menos a margem. */}
      {aberto && (
        <div className="absolute left-0 top-full z-50 mt-1 flex max-h-[70vh] w-[calc(100vw-2rem)] overflow-hidden rounded-md border border-line bg-white shadow-xl md:w-[min(920px,calc(100vw-2rem))]">
          {categorias === null ? (
            <div className="p-4 text-[13px] text-muted">Carregando categorias…</div>
          ) : categorias.length === 0 ? (
            <div className="p-4 text-[13px] text-muted">Nenhuma categoria disponível.</div>
          ) : (
            <>
              <ul className="w-[220px] shrink-0 overflow-y-auto border-r border-line py-2">
                {categorias.map((c, i) => (
                  <li key={c.id}>
                    <Link
                      href={`/categoria/${c.id}`}
                      onMouseEnter={() => setFoco(i)}
                      onFocus={() => setFoco(i)}
                      onClick={() => setAberto(false)}
                      className={`flex items-center gap-2.5 border-l-[3px] px-3.5 py-2.5 text-[13px] tracking-[0.04em] transition-colors ${
                        i === foco
                          ? "border-lm-azul bg-lm-azul/10 font-semibold text-lm-azul"
                          : "border-transparent text-ink-2 hover:border-lm-azul/40 hover:bg-lm-azul/5 hover:text-lm-azul"
                      }`}
                    >
                      <IconeCategoria nome={c.nome} className="h-4 w-4 shrink-0" />
                      {c.nome}
                    </Link>
                  </li>
                ))}
              </ul>

              <div className="flex-1 overflow-y-auto p-4">
                {ativa && (
                  <>
                    <p className="mb-3 text-[13px] font-semibold uppercase tracking-[0.08em] text-ink">
                      {ativa.nome}
                    </p>
                    {ativa.subcategorias.length === 0 ? (
                      <Link
                        href={`/categoria/${ativa.id}`}
                        onClick={() => setAberto(false)}
                        className="text-[13px] tracking-[0.04em] text-lm-azul hover:underline"
                      >
                        Ver todos os produtos de {ativa.nome}
                      </Link>
                    ) : (
                      <ul className="grid grid-cols-2 gap-x-6 gap-y-1.5 lg:grid-cols-3">
                        {ativa.subcategorias.map((s) => (
                          <li key={s.id}>
                            <Link
                              href={`/categoria/${ativa.id}?sub=${s.id}`}
                              onClick={() => setAberto(false)}
                              className="block py-0.5 text-[13px] tracking-[0.04em] text-ink-2 hover:text-lm-azul"
                            >
                              {s.nome}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// Hambúrguer que vira X quando aberto (padrão de menu recolhível) — troca o
// ícone de grid genérico que estava aqui antes, mais alinhado ao padrão
// "☰ Categorias" pedido como referência visual.
function IconeHamburguer({ className, aberto }: { className?: string; aberto: boolean }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden>
      <path
        d={aberto ? "M5 5l10 10M15 5 5 15" : "M3 6h14M3 10h14M3 14h14"}
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}
