"use client";

import { useEffect, useState } from "react";
import { iniciarConversa, podeFalarComVendedor } from "@/app/mensagens/actions";

// Chat só libera depois de pedido pago (evita contato pré-venda). Estado
// buscado no CLIENT (useEffect), nunca no Server Component da página:
// produto/[id] e loja/[id] são páginas públicas com ISR (revalidate=30/60,
// createPublicClient sem cookies) — se o pedido pago fosse checado no
// server, o HTML cacheado de um comprador vazaria para outro visitante
// (mesmo raciocínio de BotaoFavorito.tsx).
export function BotaoFalarComVendedor({
  lojaId,
  produtoId,
  className,
  children,
}: {
  lojaId: string;
  produtoId?: string;
  className?: string;
  children: React.ReactNode;
}) {
  const [liberado, setLiberado] = useState<boolean | null>(null);

  useEffect(() => {
    let ativo = true;
    podeFalarComVendedor(lojaId, produtoId ?? null).then((v) => {
      if (ativo) setLiberado(v);
    });
    return () => {
      ativo = false;
    };
  }, [lojaId, produtoId]);

  if (liberado === null) {
    return (
      <div
        aria-hidden
        className={`animate-pulse rounded bg-line/40 ${className ?? ""}`}
        style={{ minHeight: "2.625rem" }}
      />
    );
  }

  if (!liberado) {
    return (
      // Frase de duas linhas virou ícone + rótulo curto: a explicação inteira
      // fica no title/aria-label, sem custar altura no bloco de compra.
      <p
        className={`inline-flex items-center justify-center gap-1.5 rounded border border-line px-3 py-2.5 text-center text-[13px] text-muted ${className ?? ""}`}
        title="O chat com o vendedor é liberado após a compra"
        aria-label="Chat com o vendedor: liberado após a compra"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <rect x="4" y="10" width="16" height="10" rx="2" />
          <path d="M8 10V7a4 4 0 0 1 8 0v3" strokeLinecap="round" />
        </svg>
        Chat após a compra
      </p>
    );
  }

  return (
    <form action={iniciarConversa} className={className}>
      <input type="hidden" name="loja_id" value={lojaId} />
      {produtoId && <input type="hidden" name="produto_id" value={produtoId} />}
      {children}
    </form>
  );
}
