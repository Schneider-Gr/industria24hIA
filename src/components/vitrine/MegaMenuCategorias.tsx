"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

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
        className="rounded-sm px-2 py-1.5 text-[13px] tracking-[0.04em] text-white/90 transition-colors hover:bg-white/10 hover:text-white"
      >
        Categorias
      </button>

      {aberto && (
        <div className="absolute left-0 top-full z-50 mt-1 flex max-h-[70vh] w-[min(920px,calc(100vw-2rem))] overflow-hidden rounded-md border border-line bg-white shadow-xl">
          {categorias === null ? (
            <div className="p-4 text-[13px] text-muted">Carregando categorias…</div>
          ) : categorias.length === 0 ? (
            <div className="p-4 text-[13px] text-muted">Nenhuma categoria disponível.</div>
          ) : (
            <>
              <ul className="w-[200px] shrink-0 overflow-y-auto border-r border-line py-2">
                {categorias.map((c, i) => (
                  <li key={c.id}>
                    <Link
                      href={`/categoria/${c.id}`}
                      onMouseEnter={() => setFoco(i)}
                      onFocus={() => setFoco(i)}
                      onClick={() => setAberto(false)}
                      className={`block px-4 py-2 text-[13px] tracking-[0.04em] transition-colors ${
                        i === foco
                          ? "bg-aco-100 font-medium text-aco-600"
                          : "text-ink-2 hover:bg-aco-100 hover:text-aco-600"
                      }`}
                    >
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
                        className="text-[13px] tracking-[0.04em] text-aco-600 hover:underline"
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
                              className="block py-0.5 text-[13px] tracking-[0.04em] text-ink-2 hover:text-aco-600"
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
