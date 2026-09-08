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
