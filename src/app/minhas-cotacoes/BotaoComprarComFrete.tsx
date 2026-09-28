"use client";

import { useRouter } from "next/navigation";
import { useCarrinho, type ItemCarrinho } from "@/components/carrinho/carrinho";

/** "Comprar com este frete" (PRD 050, US07): troca os itens daquela loja no
 * carrinho pelos da cotação e abre o checkout. As outras lojas ficam. O
 * checkout confere a cotação no banco (itens, quantidades, CEP, validade). */
export function BotaoComprarComFrete({
  lojaId,
  itens,
  rotulo = "Comprar com este frete",
}: {
  lojaId: string;
  itens: ItemCarrinho[];
  rotulo?: string;
}) {
  const { substituirLoja } = useCarrinho();
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => {
        substituirLoja(lojaId, itens);
        router.push(`/checkout?lojas=${lojaId}`);
      }}
      className="rounded bg-lm-azul px-4 py-2 text-sm font-semibold text-white hover:bg-lm-azul-escuro"
    >
      {rotulo}
    </button>
  );
}
