// "Comprar de novo": remonta o carrinho a partir de um pedido antigo. O que
// importa: preço é o de hoje (não o do pedido), nada indisponível entra em
// silêncio, e reserva de Venda Futura não é recomprada (tem data própria).

import assert from "node:assert/strict";
import { test } from "vitest";

import { montarRecompra, type ProdutoRecompra } from "./recompra";

const telha: ProdutoRecompra = {
  id: "telha",
  nome: "Telha fibrocimento",
  valor: 89.9,
  quantidade_minima: 5,
  loja_id: "construcao",
  loja_nome: "construção",
  img: "https://x/telha.jpg",
  estoque_atual: 300,
};

const linha = (produto_id: string, quantidade: number, extra: Partial<{ venda_futura_id: string; produto_nome: string }> = {}) => ({
  produto_id,
  produto_nome: extra.produto_nome ?? produto_id,
  quantidade,
  venda_futura_id: extra.venda_futura_id ?? null,
});

test("item disponível entra com o preço de hoje", () => {
  const r = montarRecompra([linha("telha", 10)], [telha], new Set());
  assert.deepEqual(r.indisponiveis, []);
  assert.equal(r.itens.length, 1);
  assert.equal(r.itens[0].valor, 89.9);
  assert.equal(r.itens[0].quantidade, 10);
  assert.equal(r.itens[0].loja_id, "construcao");
});

test("quantidade antiga abaixo do mínimo atual sobe para o mínimo", () => {
  const r = montarRecompra([linha("telha", 2)], [telha], new Set());
  assert.equal(r.itens[0].quantidade, 5);
});

test("produto que saiu da vitrine vira indisponível pelo nome do pedido", () => {
  const r = montarRecompra([linha("sumiu", 3, { produto_nome: "Cimento CP-II" })], [telha], new Set());
  assert.deepEqual(r.itens, []);
  assert.deepEqual(r.indisponiveis, ["Cimento CP-II"]);
});

test("fora da faixa de CEP atual é indisponível", () => {
  const r = montarRecompra([linha("telha", 10)], [telha], new Set(["telha"]));
  assert.deepEqual(r.itens, []);
  assert.deepEqual(r.indisponiveis, ["Telha fibrocimento"]);
});

test("estoque menor que a quantidade é indisponível", () => {
  const r = montarRecompra([linha("telha", 400)], [telha], new Set());
  assert.deepEqual(r.indisponiveis, ["Telha fibrocimento"]);
});

test("reserva de Venda Futura não é recomprada", () => {
  const r = montarRecompra([linha("telha", 10, { venda_futura_id: "vf1" })], [telha], new Set());
  assert.deepEqual(r.itens, []);
  assert.deepEqual(r.indisponiveis, ["Telha fibrocimento"]);
});

test("mesmo produto em duas linhas soma a quantidade", () => {
  const r = montarRecompra([linha("telha", 10), linha("telha", 5)], [telha], new Set());
  assert.equal(r.itens.length, 1);
  assert.equal(r.itens[0].quantidade, 15);
});
