"use client";

import { useRouter } from "next/navigation";
import { useCarrinho, type ItemCarrinho } from "@/components/carrinho/carrinho";

// Botão "Comprar agora": mesmo padrão de BotaoAddRapido (fica na faixa de
// ações do card, com preventDefault/stopPropagation pra não disparar o
// stretched link), mas pula o carrinho — adiciona e já leva pro checkout.
// Cor sólida distinta (lm-amarelo, não uma variação de lm-azul) e ícone de
// raio para diferenciar do add-to-cart.
export function BotaoComprarRapido({ produto }: { produto: Omit<ItemCarrinho, "quantidade"> }) {
  const { adicionar } = useCarrinho();
  const router = useRouter();

  function aoClicar(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    adicionar({ ...produto, quantidade: produto.quantidade_minima ?? 1 });
    router.push("/checkout");
  }

  return (
    <button
      type="button"
      onClick={aoClicar}
      aria-label="Comprar agora"
      title="Comprar agora"
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-lm-amarelo text-lm-marinho shadow-sm transition-colors hover:brightness-95"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}
