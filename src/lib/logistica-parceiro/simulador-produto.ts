// Simulador de frete por produto (PRD 054 US05, redefinida pela dona em 25/09):
// a partir do peso e das medidas, mostra peso cobrado, modal, frete do
// afiliado e quanto o frete pesa no pedido, e sugere a compra mínima.
// Só sugere: quem muda quantidade_minima é o seller, no cadastro.

// ponytail: fator de referência fixo. Transportadora de tabela usa o fator dela
// (PRD 049 decisão 4) quando o cálculo por tabela existir.
export const FATOR_CUBAGEM_REFERENCIA = 6000;
export const LIMITE_FRETE_PEDIDO = 0.2; // PRD 054 decisão 11
// Acima disso a sugestão não é realista; vira "inviável nessa distância".
export const MAX_QTD_SUGERIDA = 1000;

// PRD 054: só o peso define a classe; piso por km da classe.
// ponytail: sem parceiros com custo declarado (US04), o frete usa o piso da classe.
export const CLASSES = [
  { classe: "moto", ateKg: 20, pisoKm: 6 },
  { classe: "carro", ateKg: 300, pisoKm: 8 },
  { classe: "caminhao", ateKg: Infinity, pisoKm: 20 },
] as const;
export type Classe = (typeof CLASSES)[number];

export type ProdutoFrete = {
  pesoKg: number | null;
  alturaCm: number | null;
  larguraCm: number | null;
  comprimentoCm: number | null;
  preco: number;
};

const r2 = (v: number) => Math.round(v * 100) / 100;

export function pesos(p: ProdutoFrete, qtd: number, fator = FATOR_CUBAGEM_REFERENCIA) {
  const real = r2((p.pesoKg ?? 0) * qtd);
  const cubado = r2(((p.alturaCm ?? 0) * (p.larguraCm ?? 0) * (p.comprimentoCm ?? 0) * qtd) / fator);
  return { real, cubado, cobrado: Math.max(real, cubado) };
}

export function classePorPeso(kg: number): Classe {
  return CLASSES.find((c) => kg <= c.ateKg) ?? CLASSES[CLASSES.length - 1];
}

export type Extras = { porto?: number; ajudantes?: number; valorAjudante?: number };

export function freteAfiliado({ distanciaM, pesoKg, porto = 0, ajudantes = 0, valorAjudante = 0 }: { distanciaM: number; pesoKg: number } & Extras) {
  const { classe, pisoKm } = classePorPeso(pesoKg);
  const km = Math.round(distanciaM / 100) / 10; // só ida, a 0,1 km (PRD 053)
  const freteKm = r2(km * pisoKm);
  return { classe, km, freteKm, total: r2(freteKm + Math.max(0, porto) + Math.max(0, ajudantes) * Math.max(0, valorAjudante)) };
}

export type Simulacao =
  | { ok: false; faltando: ("peso" | "altura" | "largura" | "comprimento")[] }
  | {
      ok: true;
      atual: { qtd: number; pesos: ReturnType<typeof pesos>; frete: ReturnType<typeof freteAfiliado>; pedido: number; pct: number };
      sugestao: number | null;
    };

export function simularProduto({
  produto,
  quantidadeMinima,
  distanciaM,
  ...extras
}: { produto: ProdutoFrete; quantidadeMinima: number; distanciaM: number } & Extras): Simulacao {
  const faltando = (
    [
      ["peso", produto.pesoKg],
      ["altura", produto.alturaCm],
      ["largura", produto.larguraCm],
      ["comprimento", produto.comprimentoCm],
    ] as const
  )
    .filter(([, v]) => !(v && v > 0))
    .map(([k]) => k);
  if (faltando.length) return { ok: false, faltando };

  const calcula = (qtd: number) => {
    const p = pesos(produto, qtd);
    const frete = freteAfiliado({ distanciaM, pesoKg: p.real, ...extras });
    const pedido = r2(produto.preco * qtd);
    return { qtd, pesos: p, frete, pedido, pct: r2(frete.total / pedido) };
  };

  const qMin = Math.max(1, Math.floor(quantidadeMinima));
  return { ok: true, atual: calcula(qMin), sugestao: sugerirMinimo(qMin, produto.preco, (q) => calcula(q).frete.total) };
}

// O frete sobe com a quantidade (troca de classe, faixa de peso), então não é
// regra de três: recalcula unidade a unidade e para na primeira que fica no
// limite. freteDe devolve null quando a fonte não atende aquela quantidade.
export function sugerirMinimo(qMin: number, preco: number, freteDe: (qtd: number) => number | null): number | null {
  for (let q = Math.max(1, qMin); q <= MAX_QTD_SUGERIDA; q++) {
    const frete = freteDe(q);
    if (frete != null && frete / (preco * q) <= LIMITE_FRETE_PEDIDO + 1e-9) return q;
  }
  return null;
}

// Transportadora de tabela: mesma regra do RPC cotar_frete_tabela (0146/0148),
// aplicada em memória porque a sugestão testa até MAX_QTD_SUGERIDA pesos.
// ponytail: só faixa de CEP de destino × peso (schema atual); origem do CD,
// kg adicional, AdValorem e ICMS entram com o cálculo completo do PRD 049.
export type FaixaFrete = {
  transportadoraId: string;
  lojaId: string | null;
  cepInicial: string;
  cepFinal: string;
  pesoMin: number;
  pesoMax: number;
  valor: number;
};

export const soDigitosCep = (cep: string) => cep.replace(/\D/g, "").padStart(8, "0");

export function freteTabela(faixas: FaixaFrete[], lojaId: string, cepDestino: string, pesoKg: number) {
  const cep = soDigitosCep(cepDestino);
  const porTransportadora = new Map<string, FaixaFrete>();
  for (const f of faixas) {
    if (cep < soDigitosCep(f.cepInicial) || cep > soDigitosCep(f.cepFinal)) continue;
    if (pesoKg < f.pesoMin || pesoKg > f.pesoMax) continue;
    if (f.lojaId != null && f.lojaId !== lojaId) continue;
    const atual = porTransportadora.get(f.transportadoraId);
    // a faixa da loja sobrepõe a global da mesma transportadora (0148)
    if (!atual || (atual.lojaId == null && f.lojaId === lojaId)) porTransportadora.set(f.transportadoraId, f);
  }
  let melhor: { transportadoraId: string; valor: number } | null = null;
  for (const f of porTransportadora.values()) {
    if (!melhor || f.valor < melhor.valor) melhor = { transportadoraId: f.transportadoraId, valor: f.valor };
  }
  return melhor;
}
