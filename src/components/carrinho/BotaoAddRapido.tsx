"use client";

import { useState } from "react";
import { useCarrinho, type ItemCarrinho } from "@/components/carrinho/carrinho";

// Botão "+" sobre a foto do card (benchmark Zé Delivery, change
// mobile-vitrine-densa-benchmark): adiciona ao carrinho direto da listagem,
// sem abrir a página do produto. Azul por decisão da dona em 11/09 — o
// DESIGN.md reserva o amarelo para a etiqueta de preço e proíbe amarelo como
// fundo de botão. Área de toque de 44px com quadrado visual de 36px (6px de
// raio, a regra de botão do DESIGN.md). Usa a quantidade mínima do produto,
// mesma regra do BotaoAddCarrinho da PDP.
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
      aria-label={ok ? "Adicionado ao carrinho" : `Adicionar ${produto.nome} ao carrinho`}
      title="Adicionar ao carrinho"
      className="group/add flex h-11 w-11 shrink-0 items-center justify-center"
    >
      <span
        className={`flex h-9 w-9 items-center justify-center rounded-md text-white shadow-[0_2px_8px_rgba(16,39,57,.25)] transition-colors ${
          ok ? "bg-ok" : "bg-lm-azul group-hover/add:bg-lm-azul-escuro"
        }`}
      >
        {ok ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" aria-hidden>
            <path d="M20 6 9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" aria-hidden>
            <path d="M12 5v14M5 12h14" strokeLinecap="round" />
          </svg>
        )}
      </span>
    </button>
  );
}
