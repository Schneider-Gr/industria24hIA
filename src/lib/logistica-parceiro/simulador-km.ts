// Botão avião (decisão da dona, 25/09/2026): o seller define, por produto, três
// bandas de frete (moto, carro, caminhão: tarifa mínima e R$/km) e a quantidade
// mínima por pedido. O simulador mostra, para perto, médio e longe, o frete
// total, quanto ele pesa no pedido e a partir de quantas unidades a entrega é
// viável (≤ 20%) ou ideal (≤ 10%).

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
export const NOME_CLASSE: Record<Classe["classe"], string> = { moto: "Moto", carro: "Carro", caminhao: "Caminhão" };

export function classePorPeso(kg: number): Classe {
  return CLASSES.find((c) => kg <= c.ateKg) ?? CLASSES[CLASSES.length - 1];
}

// Banda vazia: sem tarifa mínima; R$/km = piso do veículo.
export type Banda = { tarifaMinima?: number | null; valorKm?: number | null };
export type Bandas = Record<Classe["classe"], Banda>;
export type Extras = { porto?: number; ajudantes?: number; valorAjudante?: number };
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
export type ColunasBandas = Record<`tarifa_minima_${Classe["classe"]}` | `valor_km_${Classe["classe"]}`, number | null>;
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

// Frete total até a região = maior entre tarifa mínima e km (só ida) × R$/km
// da banda do veículo que o peso exige, + porto + ajudantes (PRD 054).
export function freteRegiao({
  distanciaM,
  pesoKg,
  bandas,
  porto = 0,
  ajudantes = 0,
  valorAjudante = 0,
}: { distanciaM: number; pesoKg: number; bandas: Bandas } & Extras) {
  const { classe, pisoKm } = classePorPeso(pesoKg);
  const banda = bandas[classe];
  const valorKm = Math.max(pisoKm, banda.valorKm ?? pisoKm);
  const tarifaMinima = banda.tarifaMinima ?? 0;
  const km = Math.round(distanciaM / 100) / 10; // a 0,1 km (PRD 053)
  const freteKm = r2(km * valorKm);
  const extras = Math.max(0, porto) + Math.max(0, ajudantes) * Math.max(0, valorAjudante);
  return { classe, km, valorKm, freteKm, tarifaMinima, total: r2(Math.max(tarifaMinima, freteKm) + extras) };
}

export function simularRegiao({
  distanciaM,
  pesoUnitKg,
  preco,
  qtd,
  bandas,
  ...extras
}: { distanciaM: number; pesoUnitKg: number; preco: number; qtd: number; bandas: Bandas } & Extras) {
  const freteDe = (q: number) => freteRegiao({ distanciaM, pesoKg: pesoUnitKg * q, bandas, ...extras }).total;
  // O frete muda com a quantidade (troca de veículo), então não é regra de três:
  // testa unidade a unidade e para na primeira que fica no limite.
  const menorQtd = (limite: number) => {
    for (let q = 1; q <= MAX_QTD; q++) if (freteDe(q) <= preco * q * limite + 1e-9) return q;
    return null;
  };
  const frete = freteRegiao({ distanciaM, pesoKg: pesoUnitKg * qtd, bandas, ...extras });
  const pedido = r2(preco * qtd);
  const faixa: Faixa =
    frete.total <= pedido * LIMITE_IDEAL + 1e-9 ? "otimo" : frete.total <= pedido * LIMITE_VIAVEL + 1e-9 ? "viavel" : "inviavel";
  return { frete, pedido, pct: r2(frete.total / pedido), faixa, qtdViavel: menorQtd(LIMITE_VIAVEL), qtdIdeal: menorQtd(LIMITE_IDEAL) };
}
