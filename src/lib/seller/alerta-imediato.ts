// Quem alertar quando uma venda derruba o estoque (PRD 047).
//
// Função pura: quem lê o banco é o chamador. A regra que importa está aqui e é
// uma só — alertar apenas o produto que MUDOU de estado por causa deste pedido.
// Sem isso, todo pedido de um produto já crítico realertaria, e o seller, que
// já recebe pedido pago, ruptura diária e avisos de venda futura, silencia o
// canal. O estado anterior é deduzido: saldo atual + o que este pedido levou.

import { estadoEstoque, type EstadoEstoque } from "./estoque-estado";

export type ItemVendido = {
  produto_id: string;
  nome: string;
  /** Saldo DEPOIS da venda, como está no banco. */
  estoque_atual: number | null;
  quantidade_minima?: number | null;
  /** Quanto este pedido levou, para reconstruir o saldo anterior. */
  quantidade: number;
  /** Item de venda futura não consome `estoque_atual` e não entra no alerta. */
  venda_futura_id?: string | null;
};

export type ProdutoAlertado = { nome: string; saldo: number; estado: EstadoEstoque };

export function produtosParaAlertar(itens: ItemVendido[]): ProdutoAlertado[] {
  const porProduto = new Map<string, ItemVendido>();

  // Mesmo produto em duas linhas: soma a quantidade, senão o saldo anterior
  // sai errado e um produto que esgotou apareceria como se já estivesse assim.
  for (const item of itens) {
    if (item.venda_futura_id) continue;
    const anterior = porProduto.get(item.produto_id);
    porProduto.set(
      item.produto_id,
      anterior ? { ...anterior, quantidade: anterior.quantidade + item.quantidade } : item,
    );
  }

  const alertados: ProdutoAlertado[] = [];
  for (const item of porProduto.values()) {
    const saldo = item.estoque_atual ?? 0;
    const depois = estadoEstoque({ estoque_atual: saldo, quantidade_minima: item.quantidade_minima });
    if (depois === "normal") continue;

    const antes = estadoEstoque({
      estoque_atual: saldo + item.quantidade,
      quantidade_minima: item.quantidade_minima,
    });
    if (antes === depois) continue; // já estava assim: quem avisa é o resumo diário

    alertados.push({ nome: item.nome, saldo, estado: depois });
  }

  // Esgotado primeiro: é a perda de venda concreta, mesma ordem do e-mail diário.
  return alertados.sort((a, b) => Number(a.estado !== "esgotado") - Number(b.estado !== "esgotado"));
}
