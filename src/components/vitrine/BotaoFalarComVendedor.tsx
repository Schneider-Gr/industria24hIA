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
      <p
        className={`inline-flex items-center justify-center rounded border border-line px-3 py-2.5 text-center text-[13px] text-muted ${className ?? ""}`}
      >
        Falar com vendedor: disponível após a compra
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
