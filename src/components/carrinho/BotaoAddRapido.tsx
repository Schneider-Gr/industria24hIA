"use client";

import { useState } from "react";
import { useCarrinho, type ItemCarrinho } from "@/components/carrinho/carrinho";

// Ícone de carrinho na faixa de ações do card (abaixo do nome do produto):
// adiciona ao carrinho direto da listagem, sem abrir a página do produto.
// Usa a quantidade mínima do produto (mesma regra do BotaoAddCarrinho da
// PDP) — se o produto exige quantidade maior, o comprador ajusta depois no
// carrinho ou na PDP; aqui é só o atalho de "eu já sei que quero este".
export function BotaoAddRapido({ produto }: { produto: Omit<ItemCarrinho, "quantidade"> }) {
  const { adicionar } = useCarrinho();
  const [ok, setOk] = useState(false);

  function aoClicar(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    adicionar({ ...produto, quantidade: produto.quantidade_minima ?? 1 });
    setOk(true);
    setTimeout(() => setOk(false), 1500);
  }

  return (
    <button
      type="button"
      onClick={aoClicar}
      aria-label="Adicionar ao carrinho"
      title="Adicionar ao carrinho"
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full shadow-sm transition-colors ${
        ok ? "bg-ok text-white" : "bg-lm-azul text-white hover:bg-lm-azul-escuro"
      }`}
    >
      {ok ? (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
          <path d="M20 6 9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path d="M3 4h2l1.6 9.6a1.5 1.5 0 0 0 1.5 1.4h6.8a1.5 1.5 0 0 0 1.5-1.2L18 7H6" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="9" cy="17.5" r="1" fill="currentColor" />
          <circle cx="14.5" cy="17.5" r="1" fill="currentColor" />
        </svg>
      )}
    </button>
  );
}
