"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { formatBRL } from "@/components/seller/format";

type ProdutoPreview = { id: string; nome: string; valor: number; img: string | null };

function IconeBusca({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden>
      <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="1.8" />
      <path d="m14 14 3.5 3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

// Busca com preview (redesign vitrine — Navegação): dropdown de até 5 produtos
// ao digitar, sem sair da página para ver se vale a pena continuar a busca.
export function CampoBusca({ className = "" }: { className?: string }) {
  const [termo, setTermo] = useState("");
  const [produtos, setProdutos] = useState<ProdutoPreview[]>([]);
  const [aberto, setAberto] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    function fechar(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setAberto(false);
      }
    }
    document.addEventListener("mousedown", fechar);
    return () => document.removeEventListener("mousedown", fechar);
  }, []);

  useEffect(() => {
    const termoAtual = termo.trim();
    // Sem setState aqui: o dropdown já se esconde com termo curto (ver
    // `termo.trim().length >= 2` no render), então "produtos" desatualizado
    // nunca chega a aparecer — limpar por antecipação seria redundante.
    if (termoAtual.length < 2) return;
    const timeout = setTimeout(() => {
      fetch(`/api/busca-preview?q=${encodeURIComponent(termoAtual)}`)
        .then((r) => r.json())
        .then((data) => setProdutos(data.produtos ?? []))
        .catch(() => setProdutos([]));
    }, 250);
    return () => clearTimeout(timeout);
  }, [termo]);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <form action="/busca" role="search" onSubmit={() => setAberto(false)}>
        <input
          type="search"
          name="q"
          value={termo}
          onChange={(e) => setTermo(e.target.value)}
          onFocus={() => setAberto(true)}
          placeholder="Buscar produtos, marcas e categorias…"
          className="w-full rounded-full border border-transparent bg-white px-4 py-2.5 pr-12 text-[14.5px] text-ink placeholder:text-muted outline-none focus:border-lm-azul sm:px-5 sm:py-3"
          aria-label="Buscar produtos"
          autoComplete="off"
        />
        <button
          type="submit"
          aria-label="Buscar"
          className="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-lm-azul text-white transition-colors hover:bg-lm-azul-escuro"
        >
          <IconeBusca className="h-4 w-4" />
        </button>
      </form>

      {aberto && termo.trim().length >= 2 && produtos.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-md border border-line bg-white shadow-[0_8px_24px_rgba(0,0,0,.12)]">
          {produtos.map((p) => (
            <a
              key={p.id}
              href={`/produto/${p.id}`}
              className="flex items-center gap-3 px-3 py-2 text-sm hover:bg-lm-cinza/60"
              onClick={() => setAberto(false)}
            >
              <div className="h-10 w-10 shrink-0 overflow-hidden rounded-sm bg-line/40">
                {p.img && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.img} alt="" className="h-full w-full object-cover" />
                )}
              </div>
              <span className="line-clamp-1 flex-1 text-ink">{p.nome}</span>
              <span className="num shrink-0 font-semibold text-ink">{formatBRL(p.valor)}</span>
            </a>
          ))}
          <button
            type="button"
            onClick={() => {
              setAberto(false);
              router.push(`/busca?q=${encodeURIComponent(termo.trim())}`);
            }}
            className="block w-full border-t border-line px-3 py-2 text-left text-xs font-semibold text-lm-azul hover:bg-lm-cinza/60"
          >
            Ver todos os resultados para “{termo.trim()}”
          </button>
        </div>
      )}
    </div>
  );
}
