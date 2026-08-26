// Upload 2: tabela de frete de UMA transportadora (planilha modelo: CEP
// origem/destino, Volume, Peso, dimensões, Valor declarado, Valor do Frete).
// Loop gerar→validar→corrigir: cada linha vira candidata a faixa de largura
// mínima (cep_destino_inicial=cep_destino_final, peso_min=peso_max — ver
// openspec/changes/transportadoras-tabela-frete-upload/proposal.md, decisão
// de granularidade); erro determinístico (máscara/espaço) é corrigido
// automaticamente, erro que exige decisão humana (CEP incompleto, valor
// ausente) bloqueia só aquela linha, sem travar as demais.
//
// ponytail: loop de "correção" aqui é normalização determinística (regex),
// não um agente LLM — cobre o caso real da planilha modelo (máscara/espaço).
// Se o formato real de transportadoras parceiras vier mais heterogêneo
// (planilhas com colunas fora de ordem, faixas textuais tipo "0-5kg"), subir
// para o loop LangGraph (ver skill langgraph-loop) nesse ponto.

export type LinhaTabelaFreteBruta = Record<string, string | undefined>;

export type FaixaFreteCorrigida = {
  cepDestinoInicial: number;
  cepDestinoFinal: number;
  pesoMin: number;
  pesoMax: number;
  valor: number;
};

export type LinhaBloqueante = { linha: LinhaTabelaFreteBruta; motivo: string };

function normalizarCep(bruto: string | undefined): number | null {
  const digitos = (bruto ?? "").replace(/\D/g, "");
  if (digitos.length !== 8) return null;
  return Number(digitos);
}

function normalizarNumero(bruto: string | undefined): number | null {
  const s = (bruto ?? "").trim().replace(",", ".");
  if (s === "") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

export function parseTabelaFrete(linhas: LinhaTabelaFreteBruta[]): {
  corrigidas: FaixaFreteCorrigida[];
  bloqueantes: LinhaBloqueante[];
} {
  const corrigidas: FaixaFreteCorrigida[] = [];
  const bloqueantes: LinhaBloqueante[] = [];

  for (const linha of linhas) {
    const cep = normalizarCep(linha["CEP destino"]);
    if (cep === null) {
      bloqueantes.push({ linha, motivo: "CEP destino inválido ou incompleto (esperado 8 dígitos)." });
      continue;
    }

    const valor = normalizarNumero(linha["Valor Atual Frete"]);
    if (valor === null || valor < 0) {
      bloqueantes.push({ linha, motivo: "Valor do frete ausente ou não numérico." });
      continue;
    }

    const peso = normalizarNumero(linha["Peso (KG)"]) ?? 0; // placeholder documentado (fluxo-frete-completo.md)

    corrigidas.push({
      cepDestinoInicial: cep,
      cepDestinoFinal: cep,
      pesoMin: peso,
      pesoMax: peso,
      valor,
    });
  }

  return { corrigidas, bloqueantes };
}
