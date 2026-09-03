import assert from "node:assert/strict";
import { test } from "vitest";
import {
  parseRange,
  resolverJanela,
  ticketMedio,
  taxaConversao,
  gmvAReceber,
  calcularDelta,
  resumoRepassesPorStatus,
} from "./dashboard-kpis";

const AGORA = new Date("2026-09-03T12:00:00.000Z");

test("parseRange aceita conhecidos e cai em 30d no resto", () => {
  assert.equal(parseRange("90d"), "90d");
  assert.equal(parseRange("mes"), "mes");
  assert.equal(parseRange("tudo"), "tudo");
  assert.equal(parseRange(undefined), "30d");
  assert.equal(parseRange("banana"), "30d");
});

test("resolverJanela 30d: janela e período anterior de mesma duração", () => {
  const j = resolverJanela("30d", AGORA);
  assert.equal(j.ate, AGORA.toISOString());
  assert.equal(j.desde, new Date("2026-08-04T12:00:00.000Z").toISOString());
  assert.equal(j.comparavel, true);
  // anterior termina onde a atual começa e tem 30 dias
  assert.equal(j.ateAnterior, j.desde);
  assert.equal(
    j.desdeAnterior,
    new Date("2026-07-05T12:00:00.000Z").toISOString(),
  );
});

test("resolverJanela mes: do dia 1 do mês; anterior é o mês passado", () => {
  const j = resolverJanela("mes", AGORA);
  assert.equal(j.desde, new Date(2026, 8, 1).toISOString());
  assert.equal(j.desdeAnterior, new Date(2026, 7, 1).toISOString());
  assert.equal(j.ateAnterior, new Date(2026, 8, 1).toISOString());
  assert.equal(j.comparavel, true);
});

test("resolverJanela tudo: desde a época, sem comparativo", () => {
  const j = resolverJanela("tudo", AGORA);
  assert.equal(j.desde, new Date(0).toISOString());
  assert.equal(j.comparavel, false);
  assert.equal(j.desdeAnterior, null);
  assert.equal(j.ateAnterior, null);
});

test("ticketMedio protege divisão por zero", () => {
  assert.equal(ticketMedio(1000, 4), 250);
  assert.equal(ticketMedio(0, 0), 0);
});

test("taxaConversao conta só 'Pagamento Realizado'", () => {
  const pedidos = [
    { status_pedido: "Pagamento Realizado" },
    { status_pedido: "Pagamento Realizado" },
    { status_pedido: "Aguardando Pagamento" },
    { status_pedido: "Cancelado" },
  ];
  assert.equal(taxaConversao(pedidos), 50);
  assert.equal(taxaConversao([]), 0);
});

test("gmvAReceber soma só os aguardando pagamento", () => {
  const pedidos = [
    { status_pedido: "Aguardando Pagamento", valor_pedido: 100 },
    { status_pedido: "Aguardando Pagamento", valor_pedido: null },
    { status_pedido: "Pagamento Realizado", valor_pedido: 999 },
  ];
  assert.equal(gmvAReceber(pedidos), 100);
});

test("calcularDelta: null quando não há base, senão pct + direção", () => {
  assert.equal(calcularDelta(10, 0), null);
  assert.deepEqual(calcularDelta(120, 100), { pct: 20, direcao: "up" });
  assert.deepEqual(calcularDelta(80, 100), { pct: -20, direcao: "down" });
  assert.deepEqual(calcularDelta(100, 100), { pct: 0, direcao: "flat" });
});

test("resumoRepassesPorStatus agrupa, soma e zera status ausentes", () => {
  const r = resumoRepassesPorStatus([
    { status: "transferido", valor: 100 },
    { status: "transferido", valor: 50 },
    { status: "pendente", valor: 30 },
    { status: "lixo", valor: 999 },
    { status: null, valor: 1 },
  ]);
  assert.deepEqual(r.transferido, { n: 2, total: 150 });
  assert.deepEqual(r.pendente, { n: 1, total: 30 });
  assert.deepEqual(r.falhou, { n: 0, total: 0 });
  assert.deepEqual(r.estornado, { n: 0, total: 0 });
});
