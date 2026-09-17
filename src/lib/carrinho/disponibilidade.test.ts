// Revalidação do item de carrinho contra o saldo real. O carrinho vive em
// localStorage e nunca era reconferido: em 16/09/2026 um item de estoque 0
// atravessou o carrinho inteiro e só quebrou na tela de pagamento, com a
// exceção de `checkout_criar_pedido` (0140:156).

import assert from "node:assert/strict";
import { test } from "vitest";
import { avaliarDisponibilidade } from "./disponibilidade";

const saldo = (over: Partial<Parameters<typeof avaliarDisponibilidade>[1]> = {}) => ({
  estoque: 100,
  reservaEstoque: 0,
  reservaPrevisao: null as string | null,
  ...over,
});

test("saldo suficiente libera o item", () => {
  const a = avaliarDisponibilidade({ quantidade: 10, venda_futura_id: null }, saldo());
  assert.equal(a.estado, "ok");
  assert.equal(a.disponivel, true);
});

test("produto sem saldo e sem reserva fica indisponível", () => {
  const a = avaliarDisponibilidade(
    { quantidade: 10, venda_futura_id: null },
    saldo({ estoque: 0 }),
  );
  assert.equal(a.estado, "sem_estoque");
  assert.equal(a.disponivel, false);
});

test("produto sem saldo com reserva ativa oferece a venda futura", () => {
  const a = avaliarDisponibilidade(
    { quantidade: 10, venda_futura_id: null },
    saldo({ estoque: 0, reservaEstoque: 500, reservaPrevisao: "2026-10-30" }),
  );
  assert.equal(a.estado, "so_reserva");
  assert.equal(a.disponivel, false);
  assert.equal(a.previsaoReserva, "2026-10-30");
});

test("quantidade acima do saldo informa o disponível real", () => {
  const a = avaliarDisponibilidade(
    { quantidade: 150, venda_futura_id: null },
    saldo({ estoque: 100 }),
  );
  assert.equal(a.estado, "acima_do_saldo");
  assert.equal(a.disponivel, false);
  assert.equal(a.maximo, 100);
});

test("item já comprado como reserva confere o saldo da reserva, não o do produto", () => {
  const ok = avaliarDisponibilidade(
    { quantidade: 200, venda_futura_id: "vf1" },
    saldo({ estoque: 0, reservaEstoque: 500, reservaPrevisao: "2026-10-30" }),
  );
  assert.equal(ok.estado, "ok");

  const demais = avaliarDisponibilidade(
    { quantidade: 600, venda_futura_id: "vf1" },
    saldo({ estoque: 0, reservaEstoque: 500, reservaPrevisao: "2026-10-30" }),
  );
  assert.equal(demais.estado, "acima_do_saldo");
  assert.equal(demais.maximo, 500);
});

test("produto que sumiu do catálogo fica indisponível", () => {
  const a = avaliarDisponibilidade({ quantidade: 1, venda_futura_id: null }, undefined);
  assert.equal(a.estado, "sem_estoque");
  assert.equal(a.disponivel, false);
});
