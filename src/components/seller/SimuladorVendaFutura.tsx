"use client";

import { useEffect, useState } from "react";
import { dadosSimulador } from "@/app/(seller)/seller/venda-futura/actions";
import { formatBRL } from "@/components/seller/format";
import type { Faixa } from "@/lib/preco-faixa";
import { ALERTA_MARGEM_PCT, matrizSimulacao, receitaLote, type Degrau } from "@/lib/venda-futura/preco-curva";
import { custoEquivalente, liquidoDe } from "@/lib/catalogo-compra/montador-faixas";

const num = (s: string) => (s.trim() === "" ? null : Number(s.replace(",", ".")));

// PRD 061, design D6: o preço de cada célula é o mesmo que o checkout cobra
// (venda_futura_preco no banco; a réplica em preco-curva.ts tem os mesmos testes).
// Busca faixas e comissão uma vez por produto; o resto recalcula no cliente.
export function SimuladorVendaFutura({
  produtoId,
  aVista,
  curva,
  producao,
  versao = 0,
}: {
  produtoId: string;
  aVista: number;
  curva: Degrau[];
  producao: number | null;
  /** muda quando o montador grava faixas novas: recarrega */
  versao?: number;
}) {
  const [custo, setCusto] = useState("");
  const [markup, setMarkup] = useState("");
  const [dados, setDados] = useState<{ id: string; faixas: Faixa[]; comissaoPct: number; estimativa: boolean } | null>(null);

  useEffect(() => {
    let vivo = true;
    dadosSimulador(produtoId)
      .then((d) => vivo && setDados({ id: produtoId, ...d }))
      .catch(() => vivo && setDados({ id: produtoId, faixas: [], comissaoPct: 5, estimativa: true }));
    return () => {
      vivo = false;
    };
  }, [produtoId, versao]);

  if (!dados || dados.id !== produtoId) return <p className="text-xs text-muted">Carregando simulador…</p>;

  const m = matrizSimulacao({ base: aVista, faixas: dados.faixas, ativo: dados.faixas.length > 0, curva, comissaoPct: dados.comissaoPct });
  const receita = producao ? receitaLote(m, producao) : null;
  // Change montador-faixas-custo-frete D7: com custo, o aviso é "abaixo do custo"; sem, 30%.
  const custoEq = custoEquivalente({ custo: num(custo), markup: num(markup), liquidoAvista: liquidoDe(aVista, dados.comissaoPct) });
  const ruim = (c: { liquido: number; descontoTotalPct: number }) =>
    custoEq != null ? c.liquido < custoEq : c.descontoTotalPct > ALERTA_MARGEM_PCT;
  const algumaRuim = m.linhas.some((l) => l.celulas.some(ruim));

  return (
    <div className="rounded border border-line bg-surface p-3">
      <p className="mb-2 text-[13px] font-semibold text-ink">
        Simulador: o comprador paga isto conforme a quantidade e quando reserva
      </p>
      <div className="mb-2 flex flex-wrap items-end gap-3 text-[11px] font-medium uppercase tracking-wider text-muted">
        <label className="flex flex-col gap-1">
          Custo por un.
          <input value={custo} onChange={(e) => setCusto(e.target.value)} inputMode="decimal" placeholder="R$" className="num w-24 rounded border border-line px-2 py-1 text-sm" />
        </label>
        <span className="pb-1.5 normal-case tracking-normal">ou</span>
        <label className="flex flex-col gap-1">
          Markup
          <input value={markup} onChange={(e) => setMarkup(e.target.value)} inputMode="decimal" placeholder="ex.: 1,3" className="num w-24 rounded border border-line px-2 py-1 text-sm" />
        </label>
        {custoEq != null && (
          <span className="num pb-1.5 normal-case tracking-normal text-ink">Custo considerado: {formatBRL(custoEq)} (só simulação)</span>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className="px-2 py-1 text-left text-[11px] font-medium uppercase tracking-wider text-muted">Quantidade</th>
              {m.colunas.map((d) => (
                <th key={d.dias_antes} className="px-2 py-1 text-right text-[11px] font-medium uppercase tracking-wider text-muted">
                  {d.dias_antes}+ dias antes (−{d.desconto_pct}%)
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {m.linhas.map((l) => (
              <tr key={l.min_qtd} className="border-t border-line">
                <td className="num px-2 py-1">{l.min_qtd === 1 ? "1 un" : `${l.min_qtd}+ un`}</td>
                {l.celulas.map((c, i) => (
                  <td key={i} className={`num px-2 py-1 text-right ${ruim(c) ? "text-erro" : ""}`}>
                    <span className="font-semibold">{formatBRL(c.preco)}</span>
                    <span className="block text-[11px] text-muted">
                      −{c.descontoTotalPct}% · você recebe {formatBRL(c.liquido)}
                    </span>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-[11px] text-muted">
        À vista hoje: {formatBRL(aVista)}. &quot;Você recebe&quot; já desconta a comissão de {dados.comissaoPct}%
        {dados.estimativa ? " (estimativa: não foi possível ler a comissão do produto)" : ""}. Faltando menos dias que o último
        degrau, vale o preço sem desconto de antecedência.
      </p>
      {receita && (
        <p className="num mt-1 text-[13px] text-ink">
          Receita das {producao} un: de {formatBRL(receita.min)} a {formatBRL(receita.max)} (você recebe de{" "}
          {formatBRL(receita.liquidoMin)} a {formatBRL(receita.liquidoMax)}).
        </p>
      )}
      {algumaRuim && (
        <p role="alert" className="mt-2 rounded-sm bg-erro/10 px-2 py-1 text-[12px] font-medium text-erro">
          {custoEq != null
            ? `Atenção: as células em vermelho deixam você abaixo do custo de ${formatBRL(custoEq)} por unidade.`
            : `Atenção: somando volume e antecedência, o desconto chega a ${m.maiorDescontoPct}% do à vista. Informe o custo ou o markup para conferir a margem.`}
        </p>
      )}
    </div>
  );
}
