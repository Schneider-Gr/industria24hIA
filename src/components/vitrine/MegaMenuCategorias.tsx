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
  const [erroCategorias, setErroCategorias] = useState(false);
  const [foco, setFoco] = useState(0);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Array<HTMLAnchorElement | null>>([]);

  useEffect(() => {
    if (categorias !== null) return;
    const controller = new AbortController();
    fetch("/api/categorias", { signal: controller.signal })
      .then((r) => r.json())
      .then((d) => {
        setCategorias(d.categorias ?? []);
        setErroCategorias(false);
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setCategorias([]);
          setErroCategorias(true);
        }
      });
    return () => controller.abort();
  }, [categorias]);

  useEffect(() => {
    if (aberto && categorias?.length) {
      itemRefs.current[foco]?.focus();
    }
  }, [aberto, foco, categorias]);

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
        aria-controls="mega-menu-categorias"
        onClick={() => setAberto((a) => !a)}
        className="flex items-center gap-1.5 rounded-sm px-2.5 py-1.5 text-[13px] font-medium tracking-[0.04em] text-white/90 transition-colors hover:bg-white/10 hover:text-white"
      >
        <IconeCategoria nome="" className="h-4 w-4" />
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

      {aberto && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/20 md:hidden"
            onClick={() => setAberto(false)}
            aria-hidden="true"
          />
          <div
            id="mega-menu-categorias"
            role="dialog"
            aria-modal="true"
            aria-label="Menu de categorias"
            className="absolute left-0 top-full z-50 mt-1 flex max-h-[70vh] w-[calc(100vw-2rem)] overflow-hidden rounded-md border border-line bg-white shadow-xl md:w-[min(920px,calc(100vw-2rem))]"
          >
            {categorias === null ? (
              <div className="p-4 text-[13px] text-muted">Carregando categorias…</div>
            ) : categorias.length === 0 ? (
              <div className="p-4 text-[13px] text-muted">
                {erroCategorias ? "Erro ao carregar categorias. Tente novamente mais tarde." : "Nenhuma categoria disponível."}
              </div>
            ) : (
              <>
                <ul className="w-[220px] shrink-0 overflow-y-auto border-r border-line py-2">
                  {categorias.map((c, i) => (
                    <li key={c.id}>
                      <Link
                        href={`/categoria/${c.id}`}
                        ref={(el) => {
                          itemRefs.current[i] = el;
                        }}
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
                      <div className="mb-4 flex items-center justify-between">
                        <p className="text-[13px] font-semibold uppercase tracking-[0.08em] text-ink">
                          {ativa.nome}
                        </p>
                        <button
                          type="button"
                          onClick={() => setAberto(false)}
                          className="rounded-sm px-2 py-1 text-[12px] font-semibold text-ink-2 hover:bg-surface"
                        >
                          Fechar
                        </button>
                      </div>
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
        </>
      )}
    </div>
  );
}
