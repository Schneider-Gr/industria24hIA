// Resolução pura do lote de afiliação (openspec afiliado-selecao-vitrine):
// dado os produtos do lote e quais já têm afiliação do usuário, decide quais
// linhas novas criar — nunca duplica, nunca inclui produto que não permite
// afiliação. Isolado de I/O para poder testar sem banco.

export type ProdutoParaAfiliacao = {
  id: string;
  loja_id: string;
  porcentagem_afiliado: number | null;
  permite_afiliacao: boolean | null;
};

export type NovaAfiliacao = {
  produto_id: string;
  loja_id: string;
  porcentagem: number;
};

export function resolverLoteAfiliacoes(
  produtos: ProdutoParaAfiliacao[],
  produtoIdsJaAfiliados: Set<string>,
): NovaAfiliacao[] {
  return produtos
    .filter((p) => p.permite_afiliacao && !produtoIdsJaAfiliados.has(p.id))
    .map((p) => ({
      produto_id: p.id,
      loja_id: p.loja_id,
      porcentagem: p.porcentagem_afiliado ?? 5,
    }));
}
