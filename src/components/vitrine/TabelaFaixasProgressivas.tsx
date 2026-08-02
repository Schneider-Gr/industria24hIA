"use client";

import { formatBRL } from "@/components/seller/format";
import { faixaVencida, type Faixa } from "@/lib/preco-faixa";
import { useSelecaoFaixa } from "@/components/vitrine/SelecaoFaixaContext";

// Antes era uma <table> puramente informativa (server-rendered) — clicar
// numa linha não fazia nada, mesmo a barra de compra logo abaixo tendo
// quantidade selecionável. Agora cada linha seleciona a faixa via o mesmo
// contexto que o BotaoAddCarrinho usa, então clicar aqui reflete no
// stepper/preço da barra de compra e, dali, no checkout — pedido do
// usuário (02/08).
export function TabelaFaixasProgressivas({ faixas }: { faixas: Faixa[] }) {
  const selecaoFaixa = useSelecaoFaixa();
  const ordenadas = faixas.slice().sort((a, b) => a.min_qtd - b.min_qtd);

  return (
    <table className="mt-2 w-full text-sm">
      <tbody>
        {ordenadas.map((faixa, idx) => {
          const vencida = faixaVencida(faixa);
          const ativa = selecaoFaixa?.quantidade === faixa.min_qtd;
          return (
            <tr key={idx} className="border-t border-[#E5E7EB] first:border-t-0">
              <td className="py-0.5">
                <button
                  type="button"
                  disabled={vencida}
                  onClick={() => selecaoFaixa?.selecionar(faixa.min_qtd)}
                  aria-pressed={ativa}
                  className={`flex w-full items-center justify-between gap-2 rounded-sm px-1.5 py-1.5 text-left transition-colors ${
                    vencida
                      ? "cursor-not-allowed text-muted"
                      : ativa
                        ? "bg-lm-azul/10 text-lm-azul"
                        : "text-[#374151] hover:bg-lm-azul/5"
                  }`}
                >
                  <span>
                    A partir de{" "}
                    <span className="num font-semibold">{faixa.min_qtd}</span> un
                  </span>
                  <span className="num font-semibold">
                    {formatBRL(faixa.valor_unitario)}/un
                    {ativa && <span className="ml-1.5 text-[11px] font-semibold">aplicada</span>}
                  </span>
                </button>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
