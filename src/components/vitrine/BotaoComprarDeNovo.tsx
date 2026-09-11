"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useCarrinho } from "@/components/carrinho/carrinho";
import { buscarRecompra } from "@/app/meus-pedidos/actions";

// "Comprar de novo" no histórico (benchmark Zé Delivery, change
// mobile-vitrine-densa-benchmark). Tudo disponível: vai direto ao carrinho.
// Algo ficou de fora: fica na página e diz o quê, para nada sumir em silêncio.
export function BotaoComprarDeNovo({ pedidoId }: { pedidoId: string }) {
  const { adicionarVarios } = useCarrinho();
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const [aviso, setAviso] = useState<{ texto: string; comItens: boolean } | null>(null);

  function aoClicar() {
    setAviso(null);
    iniciar(async () => {
      const { itens, indisponiveis } = await buscarRecompra(pedidoId);
      if (itens.length > 0) adicionarVarios(itens);
      if (indisponiveis.length === 0 && itens.length > 0) {
        router.push("/carrinho");
        return;
      }
      setAviso(
        itens.length > 0
          ? { texto: `O restante foi para o carrinho. Ficou de fora: ${indisponiveis.join(", ")}.`, comItens: true }
          : { texto: `Nenhum item deste pedido está disponível agora: ${indisponiveis.join(", ")}.`, comItens: false },
      );
    });
  }

  return (
    <div>
      <button
        type="button"
        onClick={aoClicar}
        disabled={pendente}
        className="inline-flex min-h-11 items-center gap-1.5 rounded-md border border-lm-azul px-4 text-[13px] font-semibold text-lm-azul transition-colors hover:bg-lm-azul/5 disabled:opacity-60"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
          <path d="M3 12a9 9 0 0 1 15.5-6.2L21 8" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M21 3v5h-5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M21 12a9 9 0 0 1-15.5 6.2L3 16" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M3 21v-5h5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {pendente ? "Montando o carrinho…" : "Comprar de novo"}
      </button>
      {aviso && (
        <p role="status" className="mt-2 text-[13px] leading-snug text-ink-2">
          {aviso.texto}{" "}
          {aviso.comItens && (
            <Link href="/carrinho" className="font-semibold text-lm-azul underline underline-offset-2">
              Ver carrinho
            </Link>
          )}
        </p>
      )}
    </div>
  );
}
