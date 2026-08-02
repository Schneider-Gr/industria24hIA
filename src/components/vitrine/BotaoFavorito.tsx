"use client";

import { useEffect, useState, useTransition } from "react";
import { alternarFavorito, buscarMeuFavorito } from "@/app/produto/[id]/social-actions";

// Substitui o coração decorativo/desabilitado da galeria (não havia tabela
// de favoritos até a migration 0096) — toggle real, persistido, exige login.
// Estado inicial busca no CLIENT (useEffect), nunca no Server Component da
// página: produto/[id]/page.tsx usa `revalidate = 30` (ISR, HTML
// compartilhado entre visitantes) — favoritar é por usuário, embutir no
// server vazaria o favorito de um comprador para o HTML cacheado de outro.
export function BotaoFavorito({
  produtoId,
  className,
}: {
  produtoId: string;
  className?: string;
}) {
  const [favoritado, setFavoritado] = useState(false);
  const [pending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let ativo = true;
    buscarMeuFavorito(produtoId).then((v) => {
      if (ativo) setFavoritado(v);
    });
    return () => {
      ativo = false;
    };
  }, [produtoId]);

  function aoClicar() {
    setErro(null);
    const proximo = !favoritado;
    setFavoritado(proximo); // otimista
    startTransition(async () => {
      const r = await alternarFavorito(produtoId);
      if (!r.ok) {
        setFavoritado(!proximo); // desfaz
        setErro(r.error ?? "Não foi possível favoritar agora.");
      }
    });
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={aoClicar}
        disabled={pending}
        aria-pressed={favoritado}
        aria-label={favoritado ? "Remover dos favoritos" : "Adicionar aos favoritos"}
        title={favoritado ? "Remover dos favoritos" : "Adicionar aos favoritos"}
        className={`flex h-10 w-10 items-center justify-center rounded-full shadow-md transition-colors disabled:opacity-70 ${
          favoritado ? "bg-lm-vermelho text-white" : "bg-white/90 text-lm-vermelho"
        } ${className ?? ""}`}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill={favoritado ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" aria-hidden>
          <path d="M20.8 8.6c0 5.6-8.8 10.6-8.8 10.6S3.2 14.2 3.2 8.6a5.4 5.4 0 0 1 9.6-3.4 5.4 5.4 0 0 1 8 3.4z" />
        </svg>
      </button>
      {erro && (
        <p role="alert" className="absolute right-0 top-12 w-48 rounded-sm bg-lm-marinho px-2.5 py-1.5 text-[11px] text-white shadow-lg">
          {erro}
        </p>
      )}
    </div>
  );
}
