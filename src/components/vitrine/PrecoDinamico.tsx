"use client";

import { formatBRL } from "@/components/seller/format";
import { precoFaixa, type Faixa } from "@/lib/preco-faixa";
import { useSelecaoFaixa } from "@/components/vitrine/SelecaoFaixaContext";

// Preço unitário + total reativos à faixa selecionada (mesmo padrão do
// legado industria24h.com.br, confirmado ao vivo: "Você pagará" muda com a
// quantidade/faixa escolhida). Antes o bloco acima da dobra sempre mostrava
// o preço base, mesmo com uma faixa "aplicada" selecionada na tabela —
// pedido do usuário para replicar a lógica do legado (02/08).
export function PrecoDinamico({
  valorBase,
  faixas,
  quantidadeMinima,
}: {
  valorBase: number;
  faixas: Faixa[];
  quantidadeMinima: number | null;
}) {
  const selecaoFaixa = useSelecaoFaixa();
  const qtd = selecaoFaixa?.quantidade ?? quantidadeMinima ?? 1;
  const unitario = precoFaixa(faixas, true, qtd, valorBase);
  const comDesconto = unitario < valorBase;

  return (
    <div>
      <span className="num text-[24px] font-bold text-[#121212]">{formatBRL(unitario)}</span>
      <span className="ml-1 text-sm text-[#7C7C7C]">/un</span>
      {comDesconto && selecaoFaixa?.quantidade && (
        <p className="num mt-0.5 text-sm text-ink-2">
          Você pagará: <span className="font-semibold text-ink">{formatBRL(unitario * qtd)}</span>{" "}
          <span className="text-[#7C7C7C]">
            ({qtd} un a {formatBRL(unitario)})
          </span>
        </p>
      )}
    </div>
  );
}
