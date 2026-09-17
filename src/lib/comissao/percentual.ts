// Regras de apresentação e entrada do percentual de comissão da plataforma
// (PRD 037, migration 0180). A regra de cobrança em si vive no banco, dentro da
// `comissao_pct_item` e da `checkout_criar_pedido`; aqui ficam só as duas
// bordas: o que o admin digita e o que o seller lê.

/** Padrão do sistema quando nenhum nó da taxonomia define percentual. Mesmo
 * número que a `comissao_pct_item` usa como fallback no banco. */
export const PADRAO_PCT = 5;

/** Aceita "12", "12,5", "12,5%", " 12.5 ". Campo vazio devolve null, que é
 * herança — distinto de 0, que é comissão nula deliberada. */
export function normalizarPercentual(bruto: string): number | null {
  const limpo = bruto.replace(/%/g, "").replace(",", ".").trim();
  if (!limpo) return null;
  const n = Number(limpo);
  if (!Number.isFinite(n) || n < 0 || n > 100) {
    throw new Error("Percentual inválido: informe um número entre 0 e 100.");
  }
  return Math.round(n * 100) / 100;
}

/** Percentual que incidiu num item vendido. Vem do snapshot gravado na venda e
 * nunca da configuração atual, senão mudar a comissão amanhã reescreveria o
 * extrato de ontem. Item anterior à 0180 não tem snapshot: exibe 5% quando o
 * valor confere com os 5% que eram cobrados, e omite quando não confere, caso
 * dos pedidos migrados do Bubble, em vez de mostrar um número que não bate. */
export function formatPctComissao(item: {
  valor: number | null;
  repasse_ind: number | null;
  repasse_ind_pct: number | null;
}): string {
  if (item.repasse_ind_pct != null) {
    return `${item.repasse_ind_pct.toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}%`;
  }
  if (item.valor && item.repasse_ind != null) {
    const cincoPorCento = Math.round(item.valor * PADRAO_PCT) / 100;
    if (Math.abs(cincoPorCento - item.repasse_ind) < 0.005) return "5,00%";
  }
  return "—";
}
