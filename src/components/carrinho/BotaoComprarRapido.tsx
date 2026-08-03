"use client";

import { useRouter } from "next/navigation";
import { useCarrinho, type ItemCarrinho } from "@/components/carrinho/carrinho";

// Botão "Comprar agora": mesmo padrão de BotaoAddRapido (stretched link por
// cima do card, preventDefault/stopPropagation), mas pula o carrinho —
// adiciona e já leva pro checkout. Cor sólida distinta (lm-amarelo, não uma
// variação de lm-azul) e ícone de raio para diferenciar do add-to-cart.
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
      className="absolute bottom-2 right-12 flex h-9 w-9 items-center justify-center rounded-full bg-lm-amarelo text-lm-marinho shadow-md transition-colors hover:brightness-95"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}
