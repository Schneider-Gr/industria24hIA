// Upload da tabela de faixas de frete de UMA transportadora (PRD 049 M1,
// spec admin-transportadoras/tabela-frete). Formato Bubble ampliado:
// CepInicial;CepFinal;PesoInicial;PesoFinal;Valor;Prazo Entrega Maximo;
// Prazo Entrega Minimo;AdValorem;KgAdicional;ICMS;Frete Minimo;
// Taxa Fixa por Envio;CepOrigemInicial;CepOrigemFinal. O formato antigo do
// Bubble (Prazo Max/Prazo Min) também é aceito.
//
// A planilha de cotação por envio (um CEP e um peso por linha) deixou de ser
// aceita: gravar ponto exato fazia o carrinho quase nunca bater com uma faixa.

export type LinhaTabelaFreteBruta = Record<string, string | undefined>;

export type FaixaTabela = {
  numero: number;
  cepOrigemInicial: number | null;
  cepOrigemFinal: number | null;
  cepDestinoInicial: number;
  cepDestinoFinal: number;
  pesoMin: number;
  pesoMax: number;
  valor: number;
  prazoMin: number | null;
  prazoMax: number | null;
  adValorem: number;
  kgAdicional: number;
  icms: number;
  freteMinimo: number;
  taxaFixa: number;
};

export type ErroLinha = { numero: number; motivo: string };

export type ResultadoTabela = {
  faixas: FaixaTabela[];
  erros: ErroLinha[];
  ignoradas: number;
  avisos: string[];
  /** Arquivo recusado inteiro; nada deve ser gravado. */
  recusa?: string;
};

export const LIMITE_LINHAS = 15000;

type Campo =
  | "cepInicial" | "cepFinal" | "pesoInicial" | "pesoFinal" | "valor"
  | "prazoMax" | "prazoMin" | "adValorem" | "kgAdicional" | "icms"
  | "freteMinimo" | "taxaFixa" | "cepOrigemInicial" | "cepOrigemFinal" | "atende";

// Chave normalizada (sem acento, espaço e caixa) → campo.
const ALIASES: Record<string, Campo> = {
  cepinicial: "cepInicial",
  cepfinal: "cepFinal",
  pesoinicial: "pesoInicial",
  pesofinal: "pesoFinal",
  valor: "valor",
  prazoentregamaximo: "prazoMax",
  prazomax: "prazoMax",
  prazoentregaminimo: "prazoMin",
  prazomin: "prazoMin",
  advalorem: "adValorem",
  kgadicional: "kgAdicional",
  icms: "icms",
  freteminimo: "freteMinimo",
  taxafixaporenvio: "taxaFixa",
  taxafixa: "taxaFixa",
  ceporigeminicial: "cepOrigemInicial",
  ceporigemfinal: "cepOrigemFinal",
  atende: "atende",
};

const OBRIGATORIOS: Campo[] = ["cepInicial", "cepFinal", "pesoInicial", "pesoFinal", "valor"];

function chave(cabecalho: string): string {
  return cabecalho
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]/gi, "")
    .toLowerCase();
}

function mapearLinha(bruta: LinhaTabelaFreteBruta): Partial<Record<Campo, string>> {
  const out: Partial<Record<Campo, string>> = {};
  for (const [k, v] of Object.entries(bruta)) {
    const campo = ALIASES[chave(k)];
    if (campo) out[campo] = (v ?? "").trim();
  }
  return out;
}

function cep(bruto: string | undefined): number | null {
  const digitos = (bruto ?? "").replace(/\D/g, "");
  // Célula numérica do Excel perde o zero à esquerda: 01000-000 vira 1000000.
  return digitos.length === 8 || digitos.length === 7 ? Number(digitos) : null;
}

/**
 * "1.234,56", "1,234.56", "1234.56", "\"1,5\"", "12%" e "R$ 20" viram número;
 * vazio vira null. Com `milhar` (campos em R$), "1.500" é mil e quinhentos;
 * sem ele (peso), "10.001" continua sendo 10,001 kg.
 */
export function numero(bruto: string | undefined, milhar = false): number | null {
  let s = (bruto ?? "").replace(/["'%\s]|R\$/g, "");
  if (s === "") return null;
  const virgula = s.lastIndexOf(",");
  const ponto = s.lastIndexOf(".");
  if (virgula >= 0 && ponto >= 0) {
    s = virgula > ponto ? s.replace(/\./g, "").replace(",", ".") : s.replace(/,/g, "");
  } else if (virgula >= 0) {
    s = s.replace(",", ".");
  } else if (milhar && /^\d{1,3}(\.\d{3})+$/.test(s)) {
    s = s.replace(/\./g, "");
  }
  const n = Number(s);
  return Number.isFinite(n) ? n : NaN;
}

function ehCotacaoPorEnvio(cabecalhos: string[]): boolean {
  const k = new Set(cabecalhos.map(chave));
  return !k.has("cepinicial") && k.has("cepdestino") && (k.has("valoratualfrete") || k.has("volume"));
}

export function parseTabelaFaixas(linhas: LinhaTabelaFreteBruta[]): ResultadoTabela {
  const vazio = { faixas: [], erros: [], ignoradas: 0, avisos: [] };
  const cabecalhos = linhas.length > 0 ? Object.keys(linhas[0]) : [];

  if (ehCotacaoPorEnvio(cabecalhos)) {
    return {
      ...vazio,
      recusa:
        "Esta é a planilha de cotação por envio (um CEP e um peso por linha). Use o modelo de faixas: baixe a planilha padrão na tela.",
    };
  }
  const presentes = new Set(cabecalhos.map((c) => ALIASES[chave(c)]));
  const faltando = OBRIGATORIOS.filter((c) => !presentes.has(c));
  if (linhas.length > 0 && faltando.length > 0) {
    return {
      ...vazio,
      recusa: "Colunas obrigatórias ausentes: CepInicial, CepFinal, PesoInicial, PesoFinal e Valor.",
    };
  }
  if (linhas.length > LIMITE_LINHAS) {
    return { ...vazio, recusa: `A planilha tem ${linhas.length} linhas; o limite é 15.000.` };
  }

  const faixas: FaixaTabela[] = [];
  const erros: ErroLinha[] = [];
  let ignoradas = 0;

  linhas.forEach((bruta, i) => {
    const numeroLinha = i + 2; // linha 1 é o cabeçalho
    const l = mapearLinha(bruta);
    const erro = (motivo: string) => erros.push({ numero: numeroLinha, motivo });

    if ((l.atende ?? "").toUpperCase() === "N" || (l.valor ?? "") === "") {
      ignoradas++;
      return;
    }

    const cepIni = cep(l.cepInicial);
    const cepFim = cep(l.cepFinal);
    if (cepIni === null || cepFim === null) return erro("CEP de destino inválido (esperado 8 dígitos).");
    if (cepIni > cepFim) return erro("CEP inicial maior que o CEP final.");

    const temOrigem = (l.cepOrigemInicial ?? "") !== "" || (l.cepOrigemFinal ?? "") !== "";
    const origIni = temOrigem ? cep(l.cepOrigemInicial) : null;
    const origFim = temOrigem ? cep(l.cepOrigemFinal) : null;
    if (temOrigem && (origIni === null || origFim === null)) {
      return erro("CEP de origem inválido: preencha CepOrigemInicial e CepOrigemFinal com 8 dígitos, ou deixe os dois vazios.");
    }
    if (origIni !== null && origFim !== null && origIni > origFim) return erro("CEP de origem inicial maior que o final.");

    const pesoMin = numero(l.pesoInicial);
    const pesoMax = numero(l.pesoFinal);
    if (pesoMin === null || pesoMax === null || Number.isNaN(pesoMin) || Number.isNaN(pesoMax) || pesoMin < 0) {
      return erro("Peso inicial e peso final são obrigatórios e numéricos.");
    }
    if (pesoMax <= 0 || pesoMin > pesoMax) return erro("Peso final menor que o peso inicial.");

    const valor = numero(l.valor, true);
    if (valor === null || Number.isNaN(valor) || valor < 0) return erro("Valor negativo ou não numérico.");

    const prazoMin = numero(l.prazoMin);
    const prazoMax = numero(l.prazoMax);
    if (Number.isNaN(prazoMin) || Number.isNaN(prazoMax) || (prazoMin ?? 0) < 0 || (prazoMax ?? 0) < 0) {
      return erro("Prazo não numérico ou negativo.");
    }
    if (prazoMin !== null && prazoMax !== null && prazoMin > prazoMax) return erro("Prazo mínimo maior que o prazo máximo.");

    const taxas = {
      adValorem: numero(l.adValorem) ?? 0,
      kgAdicional: numero(l.kgAdicional, true) ?? 0,
      icms: numero(l.icms) ?? 0,
      freteMinimo: numero(l.freteMinimo, true) ?? 0,
      taxaFixa: numero(l.taxaFixa, true) ?? 0,
    };
    if (Object.values(taxas).some((v) => Number.isNaN(v) || v < 0)) {
      return erro("AdValorem, KgAdicional, ICMS, Frete Minimo e Taxa Fixa devem ser números não negativos.");
    }
    if (taxas.icms >= 100) return erro("ICMS deve ser menor que 100%.");

    faixas.push({
      numero: numeroLinha,
      cepOrigemInicial: origIni,
      cepOrigemFinal: origFim,
      cepDestinoInicial: cepIni,
      cepDestinoFinal: cepFim,
      pesoMin,
      pesoMax,
      valor,
      prazoMin: prazoMin === null ? null : Math.round(prazoMin),
      prazoMax: prazoMax === null ? null : Math.round(prazoMax),
      ...taxas,
    });
  });

  const avisos: string[] = [];
  if (faixas.length > 0 && faixas.every((f) => f.kgAdicional === 0)) {
    const maior = Math.max(...faixas.map((f) => f.pesoMax));
    avisos.push(`Sem KgAdicional: pesos acima de ${maior} kg não terão frete por esta transportadora.`);
  }

  return { faixas, erros, ignoradas, avisos };
}

function cruza(a1: number | null, a2: number | null, b1: number | null, b2: number | null): boolean {
  // Origem vazia (null) vale para qualquer CD: cruza com tudo.
  if (a1 === null || b1 === null) return true;
  return a1 <= (b2 as number) && b1 <= (a2 as number);
}

type FaixaComparavel = Pick<
  FaixaTabela,
  "numero" | "cepOrigemInicial" | "cepOrigemFinal" | "cepDestinoInicial" | "cepDestinoFinal" | "pesoMin" | "pesoMax"
>;

/**
 * Pares de linhas que cobrem o mesmo CEP de origem, CEP de destino e peso
 * (limites inclusivos). Varredura ordenada pelo destino: só compara faixas
 * cujo destino ainda está aberto. A RPC substituir_faixas_transportadora
 * repete a checagem no banco.
 */
export function detectarSobreposicao(faixas: FaixaComparavel[], limite = 50): { a: number; b: number }[] {
  const ordenadas = [...faixas].sort((x, y) => x.cepDestinoInicial - y.cepDestinoInicial || x.numero - y.numero);
  const conflitos: { a: number; b: number }[] = [];
  let abertas: FaixaComparavel[] = [];

  for (const f of ordenadas) {
    abertas = abertas.filter((o) => o.cepDestinoFinal >= f.cepDestinoInicial);
    for (const o of abertas) {
      if (
        o.pesoMin <= f.pesoMax && f.pesoMin <= o.pesoMax &&
        cruza(o.cepOrigemInicial, o.cepOrigemFinal, f.cepOrigemInicial, f.cepOrigemFinal)
      ) {
        conflitos.push({ a: Math.min(o.numero, f.numero), b: Math.max(o.numero, f.numero) });
        if (conflitos.length >= limite) return conflitos.sort((x, y) => x.a - y.a || x.b - y.b);
      }
    }
    abertas.push(f);
  }
  return conflitos.sort((x, y) => x.a - y.a || x.b - y.b);
}

/** Linha no formato que substituir_faixas_transportadora (0194) espera. */
export function paraRpc(f: Omit<FaixaTabela, "numero"> & { veiculo?: string | null }) {
  return {
    cep_origem_inicial: f.cepOrigemInicial,
    cep_origem_final: f.cepOrigemFinal,
    cep_destino_inicial: f.cepDestinoInicial,
    cep_destino_final: f.cepDestinoFinal,
    peso_min: f.pesoMin,
    peso_max: f.pesoMax,
    valor: f.valor,
    prazo_min: f.prazoMin,
    prazo_max: f.prazoMax,
    ad_valorem: f.adValorem,
    kg_adicional: f.kgAdicional,
    icms: f.icms,
    frete_minimo: f.freteMinimo,
    taxa_fixa: f.taxaFixa,
    veiculo: f.veiculo ?? null,
  };
}

export type TabelaPreparada = ResultadoTabela & {
  conflitos: { a: number; b: number }[];
  /** Sem recusa, com ao menos uma faixa válida e sem sobreposição. */
  podeGravar: boolean;
};

/** Parse + sobreposição: o que o preview mostra e o que a confirmação exige. */
export function prepararTabela(linhas: LinhaTabelaFreteBruta[]): TabelaPreparada {
  const r = parseTabelaFaixas(linhas);
  const conflitos = r.recusa ? [] : detectarSobreposicao(r.faixas);
  return { ...r, conflitos, podeGravar: !r.recusa && r.faixas.length > 0 && conflitos.length === 0 };
}

/** O que volta ao navegador no preview: contagens e amostras, não as 15.000 linhas. */
export type PreviewTabela = {
  faixasValidas: number;
  amostra: FaixaTabela[];
  erros: ErroLinha[];
  totalErros: number;
  ignoradas: number;
  avisos: string[];
  conflitos: { a: number; b: number }[];
  recusa?: string;
  podeGravar: boolean;
};

export function resumoPreview(t: TabelaPreparada, tamanhoAmostra = 50): PreviewTabela {
  return {
    faixasValidas: t.faixas.length,
    amostra: t.faixas.slice(0, tamanhoAmostra),
    erros: t.erros.slice(0, tamanhoAmostra),
    totalErros: t.erros.length,
    ignoradas: t.ignoradas,
    avisos: t.avisos,
    conflitos: t.conflitos.slice(0, 20),
    recusa: t.recusa,
    podeGravar: t.podeGravar,
  };
}
