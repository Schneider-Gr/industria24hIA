import { test } from "vitest";
import assert from "node:assert/strict";
import {
  degrauVigente,
  diasAteEntrega,
  matrizSimulacao,
  precoReserva,
  receitaLote,
  validarCurva,
  validoAte,
  ofertaVitrine,
  hojeManaus,
  type Degrau,
} from "./preco-curva";
import type { Faixa } from "@/lib/preco-faixa";

// Exemplo do PRD 061 / design D2–D3 (açaí): à vista 15,90, faixas 20+ 15,40 e 50+ 14,90,
// entrega 15/12/2026, curva 60/15, 30/10, 7/5.
const CURVA: Degrau[] = [
  { dias_antes: 60, desconto_pct: 15 },
  { dias_antes: 30, desconto_pct: 10 },
  { dias_antes: 7, desconto_pct: 5 },
];
const FAIXAS: Faixa[] = [
  { min_qtd: 20, valor_unitario: 15.4 },
  { min_qtd: 50, valor_unitario: 14.9 },
];
const ENTREGA = "2026-12-15";
const HOJE_FAIXA = "2026-10-09";
const base = { base: 15.9, faixas: FAIXAS, ativo: true, curva: CURVA, entrega: ENTREGA, hojeFaixa: HOJE_FAIXA };

test("dias até a entrega", () => {
  assert.equal(diasAteEntrega(ENTREGA, "2026-10-09"), 67);
  assert.equal(diasAteEntrega(ENTREGA, "2026-12-15"), 0);
});

test("degrau vigente: maior dias_antes que ainda cabe", () => {
  assert.deepEqual(degrauVigente(CURVA, ENTREGA, "2026-10-09"), CURVA[0]);
  assert.deepEqual(degrauVigente(CURVA, ENTREGA, "2026-10-16"), CURVA[0]); // 60 dias: último dia
  assert.deepEqual(degrauVigente(CURVA, ENTREGA, "2026-10-17"), CURVA[1]); // 59 dias
  assert.deepEqual(degrauVigente(CURVA, ENTREGA, "2026-12-08"), CURVA[2]); // 7 dias
  assert.equal(degrauVigente(CURVA, ENTREGA, "2026-12-09"), null); // 6 dias
  assert.equal(degrauVigente([], ENTREGA, "2026-10-09"), null);
});

test("preço da reserva: faixa × (1 − degrau), arredondado em centavos (fixtures do design D3)", () => {
  const p = (qtd: number, data: string) => precoReserva({ ...base, qtd, data }).preco;
  assert.equal(p(1, "2026-10-09"), 13.52); // 1590 × 85 / 100 = 1351,5 → 1352
  assert.equal(p(20, "2026-10-09"), 13.09);
  assert.equal(p(50, "2026-10-09"), 12.67); // 1266,5 → 1267
  assert.equal(p(1, "2026-10-17"), 14.31);
  assert.equal(p(50, "2026-12-08"), 14.16); // 1415,5 → 1416
  assert.equal(p(1, "2026-12-09"), 15.9); // sem degrau: só a faixa
  assert.equal(p(50, "2026-12-09"), 14.9);
});

test("preço da reserva devolve o desconto e a faixa aplicados", () => {
  const r = precoReserva({ ...base, qtd: 50, data: "2026-10-09" });
  assert.equal(r.desconto_pct, 15);
  assert.equal(r.faixa, 14.9);
});

test("lote sem curva: valor do lote (ou à vista), sem faixa de volume — comportamento atual", () => {
  const semCurva = { ...base, curva: [] as Degrau[] };
  assert.equal(precoReserva({ ...semCurva, valorLote: 14.9, qtd: 50, data: "2026-10-09" }).preco, 14.9);
  assert.equal(precoReserva({ ...semCurva, valorLote: null, qtd: 50, data: "2026-10-09" }).preco, 15.9);
});

test("teto: nunca acima do à vista", () => {
  const faixaAcima: Faixa[] = [{ min_qtd: 1, valor_unitario: 99 }];
  const r = precoReserva({ ...base, faixas: faixaAcima, qtd: 1, data: "2026-12-09" });
  assert.equal(r.preco, 15.9);
});

test("validade do degrau e próximo preço", () => {
  assert.deepEqual(validoAte(CURVA, ENTREGA, "2026-10-09"), { ate: "2026-10-16", proximo: CURVA[1] });
  assert.deepEqual(validoAte(CURVA, ENTREGA, "2026-12-08"), { ate: "2026-12-08", proximo: null });
  assert.equal(validoAte(CURVA, ENTREGA, "2026-12-09"), null);
});

test("validação da curva", () => {
  assert.equal(validarCurva(CURVA), null);
  assert.equal(validarCurva([]), null);
  assert.match(validarCurva([...CURVA, { dias_antes: 3, desconto_pct: 2 }]) ?? "", /3 degraus/);
  assert.match(validarCurva([{ dias_antes: 60, desconto_pct: 5 }, { dias_antes: 7, desconto_pct: 15 }]) ?? "", /maior/);
  assert.match(validarCurva([{ dias_antes: 30, desconto_pct: 10 }, { dias_antes: 30, desconto_pct: 5 }]) ?? "", /repetid/);
  assert.match(validarCurva([{ dias_antes: 0, desconto_pct: 10 }]) ?? "", /dias/);
  assert.match(validarCurva([{ dias_antes: 30, desconto_pct: 95 }]) ?? "", /desconto/);
  assert.match(validarCurva([{ dias_antes: 30, desconto_pct: 7.5 }]) ?? "", /desconto/);
});

test("matriz do simulador (açaí): preço, desconto total e líquido depois da comissão", () => {
  const m = matrizSimulacao({ base: 15.9, faixas: FAIXAS, ativo: true, curva: CURVA, comissaoPct: 5, hojeFaixa: HOJE_FAIXA });
  assert.deepEqual(m.colunas, CURVA);
  assert.deepEqual(m.linhas.map((l) => l.min_qtd), [1, 20, 50]);
  const c = m.linhas[2].celulas[0]; // 50+ × 60 dias
  assert.deepEqual(c, { preco: 12.67, descontoTotalPct: 20, liquido: 12.04 });
  assert.deepEqual(m.linhas[0].celulas.map((x) => x.preco), [13.52, 14.31, 15.11]);
  assert.deepEqual(m.linhas[1].celulas.map((x) => x.liquido), [12.44, 13.17, 13.9]);
  assert.equal(m.maiorDescontoPct, 20);
});

test("receita do lote pela produção prevista", () => {
  const m = matrizSimulacao({ base: 15.9, faixas: FAIXAS, ativo: true, curva: CURVA, comissaoPct: 5, hojeFaixa: HOJE_FAIXA });
  assert.deepEqual(receitaLote(m, 1000), { min: 12670, max: 15110, liquidoMin: 12040, liquidoMax: 14350 });
});

test("oferta da vitrine: preço de hoje, selo, validade e 'a partir de' na maior faixa", () => {
  const o = ofertaVitrine({ ...base, qtd: 1, data: "2026-10-09" });
  assert.deepEqual(o, { valor: 13.52, abaixoPct: 15, validoAte: "2026-10-16", aPartirDe: { valor: 12.67, min_qtd: 50 } });
});

test("oferta da vitrine: lote antigo mostra o valor do lote e o selo, sem validade", () => {
  const o = ofertaVitrine({ ...base, curva: [], valorLote: 14.31, qtd: 1, data: "2026-10-09" });
  assert.deepEqual(o, { valor: 14.31, abaixoPct: 10, validoAte: null, aPartirDe: null });
});

test("oferta da vitrine: depois do último degrau, sem selo de curva nem validade", () => {
  const o = ofertaVitrine({ ...base, ativo: false, qtd: 1, data: "2026-12-09" });
  assert.deepEqual(o, { valor: 15.9, abaixoPct: 0, validoAte: null, aPartirDe: null });
});

test("hoje em Manaus (UTC−4)", () => {
  assert.equal(hojeManaus(new Date("2026-10-10T03:59:00Z")), "2026-10-09");
  assert.equal(hojeManaus(new Date("2026-10-10T04:00:00Z")), "2026-10-10");
});
