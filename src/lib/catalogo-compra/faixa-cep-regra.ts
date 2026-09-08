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

/** Marca os itens cujo id está em `fora`, preservando os demais por
 *  referência. Existe separado do I/O porque o vitest do projeto não resolve
 *  `@/` nem `server-only`, e o que precisa de check é justamente esta regra:
 *  a lista NUNCA encolhe (o legado rotula, não esconde). */
export function marcarIndisponiveis<T extends { id: string; indisponivelRegiao?: boolean }>(
  itens: T[],
  fora: Set<string>,
): T[] {
  if (fora.size === 0) return itens;
  return itens.map((i) => (fora.has(i.id) ? { ...i, indisponivelRegiao: true } : i));
}
