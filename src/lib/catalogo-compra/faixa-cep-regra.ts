// Regra pura de cobertura por faixa de CEP (paridade Bubble:
// Produto_ecommerce.*FaixaDeCEP). Sem I/O, para o teste do CI conseguir
// importar sem alias nem `server-only`.

export type Faixa = { cep_inicial: number; cep_final: number };

/** Intervalo fechado nas duas pontas: o Bubble cadastra CepInicial e CepFinal
 *  como o primeiro e o último CEP atendidos, e a RPC de frete já compara com
 *  `between`. */
export function cepCobertoPelaFaixa(cep: number, faixa: Faixa | null | undefined): boolean {
  if (!faixa) return true; // sem faixa declarada, o produto atende todo mundo
  return cep >= faixa.cep_inicial && cep <= faixa.cep_final;
}

/** Remove da lista quem está fora da faixa. Decisão do dono em 08/09/2026,
 *  revertendo a marcação: o produto que não chega ao comprador não aparece.
 *
 *  Consequência medida no cadastro de então: com os 111 aprovados todos com
 *  faixa, e as faixas cobrindo só AM, AC e DF, a vitrine mostra 72 produtos
 *  para Manaus, 22 para Rio Branco, 14 para Porto Alegre e NENHUM para São
 *  Paulo. Vitrine vazia é o comportamento esperado onde nenhum seller
 *  declarou cobertura, não um bug. */
export function esconderForaDaFaixa<T extends { id: string }>(itens: T[], fora: Set<string>): T[];
export function esconderForaDaFaixa<T>(
  itens: T[],
  fora: Set<string>,
  idDoItem: (item: T) => string,
): T[];
export function esconderForaDaFaixa<T>(
  itens: T[],
  fora: Set<string>,
  idDoItem?: (item: T) => string,
): T[] {
  if (fora.size === 0) return itens;
  const id = idDoItem ?? ((item: T) => (item as { id: string }).id);
  return itens.filter((i) => !fora.has(id(i)));
}

/** Quantos itens distintos o CEP removeu da vitrine, para o aviso que informa
 *  o comprador do que ficou de fora. Conta por id único porque a home junta
 *  quatro listas (produtos, descontos, supermercado e galerias) que se
 *  sobrepõem — somar as listas contaria o mesmo produto várias vezes. */
export function contarForaDaFaixa(itens: { id: string }[], fora: Set<string>): number {
  if (fora.size === 0) return 0;
  const vistos = new Set<string>();
  for (const i of itens) if (fora.has(i.id)) vistos.add(i.id);
  return vistos.size;
}

/** Cobertura N:N (migration 0169): basta UMA das regiões declaradas conter o
 *  CEP. Lista vazia significa produto sem cobertura declarada, e aí vale o
 *  mesmo fail-open de `cepCobertoPelaFaixa` — quem não declarou nada não é
 *  escondido por esta regra. */
export function cepCobertoPorAlguma(cep: number, faixas: Faixa[]): boolean {
  if (faixas.length === 0) return true;
  return faixas.some((f) => cepCobertoPelaFaixa(cep, f));
}
