// "Comprar de novo" (change mobile-vitrine-densa-benchmark): transforma as
// linhas de um pedido antigo em itens de carrinho com o preço de HOJE. Regra
// pura, sem I/O — quem chama busca os produtos atuais e a cobertura de CEP.

export type LinhaRecompra = {
  produto_id: string | null;
  produto_nome: string | null;
  quantidade: number | null;
  venda_futura_id: string | null;
};

/** Produto como está na vitrine agora (aprovado e com preço). */
export type ProdutoRecompra = {
  id: string;
  nome: string;
  valor: number;
  quantidade_minima: number | null;
  loja_id: string;
  loja_nome: string;
  img: string | null;
  estoque_atual: number | null;
};

/** Mesmo formato de `ItemCarrinho` (sem importar o módulo client do carrinho). */
export type ItemRecompra = {
  produto_id: string;
  nome: string;
  valor: number;
  quantidade: number;
  quantidade_minima: number | null;
  loja_id: string;
  loja_nome: string;
  img: string | null;
};

export function montarRecompra(
  linhas: LinhaRecompra[],
  produtos: ProdutoRecompra[],
  foraDaFaixa: Set<string>,
): { itens: ItemRecompra[]; indisponiveis: string[] } {
  const porId = new Map(produtos.map((p) => [p.id, p]));
  const somado = new Map<string, number>();
  const indisponiveis = new Set<string>();

  for (const l of linhas) {
    const p = l.produto_id ? porId.get(l.produto_id) : undefined;
    // Reserva de Venda Futura tem data e estoque próprios: não se recompra
    // como item comum. Produto fora da vitrine ou do CEP também não entra.
    if (l.venda_futura_id || !p || foraDaFaixa.has(p.id)) {
      indisponiveis.add(p?.nome ?? l.produto_nome ?? "Produto");
      continue;
    }
    somado.set(p.id, (somado.get(p.id) ?? 0) + (l.quantidade ?? 0));
  }

  const itens: ItemRecompra[] = [];
  for (const [id, quantidadeAntiga] of somado) {
    const p = porId.get(id)!;
    const quantidade = Math.max(quantidadeAntiga, p.quantidade_minima ?? 1);
    if (p.estoque_atual != null && p.estoque_atual < quantidade) {
      indisponiveis.add(p.nome);
      continue;
    }
    itens.push({
      produto_id: p.id,
      nome: p.nome,
      valor: p.valor,
      quantidade,
      quantidade_minima: p.quantidade_minima,
      loja_id: p.loja_id,
      loja_nome: p.loja_nome,
      img: p.img,
    });
  }
  return { itens, indisponiveis: [...indisponiveis] };
}
