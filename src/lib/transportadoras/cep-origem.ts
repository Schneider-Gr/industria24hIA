// CEP de origem do frete (design D10): o CEP do produto e, na falta dele, o
// da loja, como a 0167 já faz. `cep_produto` está gravado em formatos
// misturados ("92.711-000", "69005-000", "69903012"); a leitura normaliza e
// não reescreve o dado.

export function normalizarCep(bruto: string | null | undefined): number | null {
  const digitos = (bruto ?? "").replace(/\D/g, "");
  // Célula numérica do Excel perde o zero à esquerda: 01000-000 vira 1000000.
  if (digitos.length !== 8 && digitos.length !== 7) return null;
  const n = Number(digitos);
  return n >= 1000000 ? n : null;
}

export type CepOrigem = { cep: number; fonte: "produto" | "loja" } | { cep: null; fonte: null };

export function cepOrigemDoProduto(cepProduto: string | null | undefined, cepLoja: string | null | undefined): CepOrigem {
  const doProduto = normalizarCep(cepProduto);
  if (doProduto !== null) return { cep: doProduto, fonte: "produto" };
  const daLoja = normalizarCep(cepLoja);
  if (daLoja !== null) return { cep: daLoja, fonte: "loja" };
  return { cep: null, fonte: null };
}
