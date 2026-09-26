// Simulador do botão avião (#804, change OpenSpec
// simulador-aviao-bandas-regioes-travessia): o seller define, por produto,
// bandas de frete por veículo (tarifa mínima e R$/km) e a quantidade mínima por
// pedido; o simulador mostra, para perto, médio e longe, o custo total da
// entrega (km de estrada + balsa só de ida), quanto ele pesa no pedido e a
// partir de quantas unidades a entrega é viável (≤ 20%) ou ideal (≤ 10%).

export const LIMITE_IDEAL = 0.1;
export const LIMITE_VIAVEL = 0.2;
// Acima disso a sugestão não é realista; vira "inviável nessa distância".
export const MAX_QTD = 1000;

// PRD 054: só o peso define o veículo; piso por km do veículo.
export const CLASSES = [
  { classe: "moto", ateKg: 20, pisoKm: 6 },
  { classe: "carro", ateKg: 300, pisoKm: 8 },
  { classe: "caminhao", ateKg: Infinity, pisoKm: 20 },
] as const;
export type Classe = (typeof CLASSES)[number];
export type NomeClasse = Classe["classe"];
export const NOME_CLASSE: Record<NomeClasse, string> = { moto: "Moto", carro: "Carro", caminhao: "Caminhão" };

export function classePorPeso(kg: number): Classe {
  return CLASSES.find((c) => kg <= c.ateKg) ?? CLASSES[CLASSES.length - 1];
}

// Banda vazia: sem tarifa mínima; R$/km = piso do veículo.
export type Banda = { tarifaMinima?: number | null; valorKm?: number | null };
export type Bandas = Record<NomeClasse, Banda>;
/** Valor da balsa (só ida) por veículo, já com o fator de equivalência. */
export type BalsaPorVeiculo = Partial<Record<NomeClasse, number | null>>;
export type Faixa = "otimo" | "viavel" | "inviavel";

const r2 = (v: number) => Math.round(v * 100) / 100;
const brl = (v: number) => `R$ ${v.toFixed(2).replace(".", ",")}`;

export function validarBandas(bandas: Bandas): string[] {
  const erros: string[] = [];
  for (const c of CLASSES) {
    const b = bandas[c.classe];
    if (b.valorKm != null && b.valorKm < c.pisoKm) erros.push(`${NOME_CLASSE[c.classe]}: R$/km mínimo é ${brl(c.pisoKm)}.`);
    if (b.tarifaMinima != null && b.tarifaMinima < 0) erros.push(`${NOME_CLASSE[c.classe]}: tarifa mínima não pode ser negativa.`);
  }
  return erros;
}

// Colunas da 0201 em produtos (fora de database.types.ts até regenerar os tipos).
export type ColunasBandas = Record<`tarifa_minima_${NomeClasse}` | `valor_km_${NomeClasse}`, number | null>;
export const COLUNAS_BANDAS = CLASSES.flatMap((c) => [`tarifa_minima_${c.classe}`, `valor_km_${c.classe}`]).join(", ");

export function bandasDasColunas(p: Partial<ColunasBandas>): Bandas {
  const n = (v: number | null | undefined) => (v == null ? null : Number(v)); // numeric vem como string
  return Object.fromEntries(
    CLASSES.map((c) => [c.classe, { tarifaMinima: n(p[`tarifa_minima_${c.classe}`]), valorKm: n(p[`valor_km_${c.classe}`]) }]),
  ) as Bandas;
}

export function colunasDasBandas(b: Bandas): ColunasBandas {
  return Object.fromEntries(
    CLASSES.flatMap((c) => [
      [`tarifa_minima_${c.classe}`, b[c.classe].tarifaMinima ?? null],
      [`valor_km_${c.classe}`, b[c.classe].valorKm ?? null],
    ]),
  ) as ColunasBandas;
}

type Rota = { distanciaM: number; barcoM?: number; balsa?: BalsaPorVeiculo };

// Frete = maior entre tarifa mínima e km de estrada × R$/km da banda do veículo
// que o peso exige, + balsa só de ida. O trecho de barco vem dentro da distância
// da rota e não é cobrado como km.
export function freteRegiao({ pesoKg, ...resto }: Rota & { pesoKg: number; bandas: Bandas }) {
  return freteDoVeiculo({ ...resto, classe: classePorPeso(pesoKg).classe });
}

function freteDoVeiculo({ distanciaM, barcoM = 0, balsa, bandas, classe }: Rota & { bandas: Bandas; classe: NomeClasse }) {
  const { pisoKm } = CLASSES.find((c) => c.classe === classe)!;
  const banda = bandas[classe];
  const valorKm = Math.max(pisoKm, banda.valorKm ?? pisoKm);
  const tarifaMinima = banda.tarifaMinima ?? 0;
  const km = Math.round(Math.max(0, distanciaM - barcoM) / 100) / 10; // a 0,1 km (PRD 053)
  const kmBarco = Math.round(barcoM / 100) / 10;
  const freteKm = r2(km * valorKm);
  // Balsa informada (detectada pelo Google ou pelo seller): soma só de ida.
  const valorBalsa = Math.max(0, balsa?.[classe] ?? 0);
  return { classe, km, kmBarco, valorKm, freteKm, tarifaMinima, balsa: valorBalsa, total: r2(Math.max(tarifaMinima, freteKm) + valorBalsa) };
}

const faixaDe = (frete: number, pedido: number): Faixa =>
  frete <= pedido * LIMITE_IDEAL + 1e-9 ? "otimo" : frete <= pedido * LIMITE_VIAVEL + 1e-9 ? "viavel" : "inviavel";

export type Viabilidade = { primeira: number | null; primeiraClasse: NomeClasse | null; estavel: number | null };

// O frete muda com a quantidade (troca de veículo), então não é regra de três.
// primeira = menor quantidade que fecha; estavel = a partir dela, toda quantidade
// até MAX_QTD fecha. Diferem quando a troca de veículo "fura" a viabilidade.
function viabilidade(freteDe: (q: number) => { total: number; classe: NomeClasse }, preco: number, limite: number): Viabilidade {
  const cabe = (q: number) => freteDe(q).total <= preco * q * limite + 1e-9;
  let primeira: number | null = null;
  for (let q = 1; q <= MAX_QTD; q++) {
    if (cabe(q)) {
      primeira = q;
      break;
    }
  }
  let estavel: number | null = null;
  for (let q = MAX_QTD; q >= 1 && cabe(q); q--) estavel = q;
  return { primeira, primeiraClasse: primeira == null ? null : freteDe(primeira).classe, estavel };
}

export function simularRegiao({
  pesoUnitKg,
  preco,
  qtd,
  bandas,
  ...rota
}: Rota & { pesoUnitKg: number; preco: number; qtd: number; bandas: Bandas }) {
  const freteDe = (q: number) => freteRegiao({ ...rota, pesoKg: pesoUnitKg * q, bandas });
  const frete = freteDe(qtd);
  const pedido = r2(preco * qtd);
  return {
    frete,
    pedido,
    pct: r2(frete.total / pedido),
    faixa: faixaDe(frete.total, pedido),
    viavel: viabilidade(freteDe, preco, LIMITE_VIAVEL),
    ideal: viabilidade(freteDe, preco, LIMITE_IDEAL),
  };
}

// Grade quantidade × R$/km: o R$/km da coluna vale para o veículo que cada
// quantidade usa (a tarifa mínima da banda continua valendo).
export function gradeRegiao({
  pesoUnitKg,
  preco,
  bandas,
  quantidades,
  valoresKm,
  ...rota
}: Rota & { pesoUnitKg: number; preco: number; bandas: Bandas; quantidades: number[]; valoresKm: number[] }) {
  return quantidades.map((q) =>
    valoresKm.map((v) => {
      const { classe } = classePorPeso(pesoUnitKg * q);
      const frete = freteRegiao({ ...rota, pesoKg: pesoUnitKg * q, bandas: { ...bandas, [classe]: { ...bandas[classe], valorKm: v } } });
      const pedido = preco * q;
      return { qtd: q, valorKm: v, classe, frete: frete.total, pct: r2(frete.total / pedido), faixa: faixaDe(frete.total, pedido) };
    }),
  );
}

// Menor quantidade estável que fecha todas as regiões pedidas (null se alguma não fecha).
export function quantidadeQueCobre(estaveis: (number | null)[]): number | null {
  return estaveis.some((e) => e == null) ? null : Math.max(...(estaveis as number[]));
}

// Eixos da grade: a quantidade simulada dobrando (até MAX_QTD) e o R$/km do
// piso até ~35% acima do valor atual da banda.
export function eixosGrade({ qtd, valorKmAtual, pisoKm }: { qtd: number; valorKmAtual: number; pisoKm: number }) {
  const quantidades = [1, 2, 4, 8].map((m) => qtd * m).filter((q) => q <= MAX_QTD);
  const valoresKm = [...new Set([pisoKm, valorKmAtual, Math.round(valorKmAtual * 1.15), Math.round(valorKmAtual * 1.35)])]
    .filter((v) => v >= pisoKm)
    .sort((a, b) => a - b);
  return { quantidades, valoresKm };
}

// Balsa por veículo a partir de uma linha da tabela travessias (0202).
export function balsaDaTravessia(t: {
  valor_equivalente: number;
  fator_moto: number | null;
  fator_carro: number | null;
  fator_caminhao: number | null;
}): Record<NomeClasse, number | null> {
  const v = (f: number | null) => (f == null ? null : r2(Number(t.valor_equivalente) * Number(f)));
  return { moto: v(t.fator_moto), carro: v(t.fator_carro), caminhao: v(t.fator_caminhao) };
}

// Frete de cada veículo na mesma rota, para o seller comparar. leva = o veículo
// aguenta o peso da quantidade; exigido = o menor que aguenta (o que a entrega usa).
export function freteVeiculos({ pesoKg, preco, qtd, ...rota }: Rota & { pesoKg: number; preco: number; qtd: number; bandas: Bandas }) {
  const exigido = classePorPeso(pesoKg).classe;
  const pedido = preco * qtd;
  return CLASSES.map((c) => {
    const f = freteDoVeiculo({ ...rota, classe: c.classe });
    return { classe: c.classe, leva: pesoKg <= c.ateKg, exigido: c.classe === exigido, frete: f.total, pct: r2(f.total / pedido), faixa: faixaDe(f.total, pedido) };
  });
}
