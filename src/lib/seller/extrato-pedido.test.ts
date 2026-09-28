import assert from "node:assert/strict";
import { test } from "vitest";
import { extratoPedido } from "./extrato-pedido";

const item = (o: Partial<Parameters<typeof extratoPedido>[0][number]> = {}) => ({
  valor: 100,
  repasse_ind: 10,
  repasse_afiliado: 0,
  valor_frete: null,
  frete_destinatario: null,
  ...o,
});

test("frete do seller entra integral no a receber, sem comissão", () => {
  const e = extratoPedido([
    item({ valor: 120, repasse_ind: 12, valor_frete: 21, frete_destinatario: "seller" }),
    item({ valor: 80, repasse_ind: 8, valor_frete: 14, frete_destinatario: "seller" }),
  ]);
  assert.equal(e.produtos, 200);
  assert.equal(e.comissao, 20);
  assert.equal(e.freteSeller, 35);
  assert.equal(e.aReceber, 215);
});

test("frete de terceiro (Uber, plataforma) fica fora do a receber", () => {
  const e = extratoPedido([item({ valor: 200, repasse_ind: 20, valor_frete: 19.9, frete_destinatario: "terceiro" })]);
  assert.equal(e.freteTerceiro, 19.9);
  assert.equal(e.aReceber, 180);
});

test("pedido anterior à regra: frete aparece como não incluído", () => {
  const e = extratoPedido([item({ valor: 50, repasse_ind: 5, repasse_afiliado: 2.5, valor_frete: 5 })]);
  assert.equal(e.freteAnterior, 5);
  assert.equal(e.comissao, 7.5);
  assert.equal(e.aReceber, 42.5);
});

test("soma em centavos sem erro de ponto flutuante", () => {
  const e = extratoPedido([
    item({ valor: 0.1, repasse_ind: 0, valor_frete: 0.2, frete_destinatario: "seller" }),
    item({ valor: 0.2, repasse_ind: 0, valor_frete: 0.1, frete_destinatario: "seller" }),
  ]);
  assert.equal(e.aReceber, 0.6);
});
