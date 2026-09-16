// Checks das duas travas de compra mínima do carrinho (ticket mínimo da loja e
// quantidade mínima do produto). Réplica da regra que a checkout_criar_pedido
// aplica no banco (0140:139 e 0140:214) — se a migration mudar, mude aqui.

import assert from "node:assert/strict";
import { test } from "vitest";
import { avaliarGrupo, ordenarPorGap, subtotalComFaixa } from "./travas-minimas";

const item = (over: Partial<Parameters<typeof avaliarGrupo>[0][number]> = {}) => ({
  produto_id: "p1",
  nome: "Tijolo",
  valor: 5,
  quantidade: 1000,
  quantidade_minima: 1000,
  ...over,
});

test("loja sem nenhum mínimo configurado libera o grupo", () => {
  const a = avaliarGrupo([item({ quantidade_minima: null })], null);
  assert.equal(a.apto, true);
  assert.equal(a.motivo, null);
  assert.equal(a.gap, 0);
});

test("subtotal abaixo do ticket bloqueia por ticket_minimo", () => {
  const a = avaliarGrupo([item()], 10000);
  assert.equal(a.subtotal, 5000);
  assert.equal(a.apto, false);
  assert.equal(a.motivo, "ticket_minimo");
  assert.equal(a.gap, 5000);
});

test("subtotal exatamente igual ao ticket libera", () => {
  const a = avaliarGrupo([item({ quantidade: 2000 })], 10000);
  assert.equal(a.apto, true);
  assert.equal(a.gap, 0);
});

test("item abaixo da quantidade mínima bloqueia mesmo com subtotal acima do ticket", () => {
  const a = avaliarGrupo([item({ quantidade: 3000, quantidade_minima: 4000 })], 10000);
  assert.equal(a.subtotal, 15000);
  assert.equal(a.apto, false);
  assert.equal(a.motivo, "quantidade_minima");
  assert.equal(a.itensAbaixoDoMinimo[0].quantidade_minima, 4000);
});

test("as duas travas violadas ao mesmo tempo reportam ambos", () => {
  const a = avaliarGrupo([item({ quantidade: 100, quantidade_minima: 1000 })], 10000);
  assert.equal(a.motivo, "ambos");
  assert.equal(a.apto, false);
});

test("desconto progressivo derruba o subtotal e pode bloquear o grupo", () => {
  // Preço-tabela levaria a R$ 10.030 (acima do ticket), mas a faixa aplicada
  // pelo banco leva a R$ 9.428,20 — bloqueia. Comparar sem faixa faria a UI
  // liberar um grupo que o banco reprova.
  const faixas = { p1: [{ min_qtd: 1300, valor_unitario: 4.7 }] };
  const itens = [item({ quantidade: 2006, valor: 5 })];
  assert.equal(subtotalComFaixa(itens, {}), 10030);
  const a = avaliarGrupo(itens, 10000, faixas);
  assert.equal(Number(a.subtotal.toFixed(2)), 9428.2);
  assert.equal(a.apto, false);
  assert.equal(a.motivo, "ticket_minimo");
});

test("ticket zero ou nulo não bloqueia", () => {
  assert.equal(avaliarGrupo([item()], 0).apto, true);
  assert.equal(avaliarGrupo([item()], undefined).apto, true);
});

test("sugestões priorizam a faixa de 60% a 130% do gap", () => {
  const candidatos = [
    { id: "barato", valor: 50 },
    { id: "naFaixa", valor: 2400 },
    { id: "caro", valor: 90000 },
    { id: "naFaixaAlto", valor: 4000 },
  ];
  const ordenado = ordenarPorGap(candidatos, 3200);
  assert.deepEqual(
    ordenado.map((c) => c.id),
    // dentro da faixa primeiro (empate de distancia mantem a ordem original),
    // depois o resto pela menor distancia ao gap
    ["naFaixa", "naFaixaAlto", "barato", "caro"],
  );
});

test("sem produto na faixa, ordena pela menor distância ao gap", () => {
  const ordenado = ordenarPorGap([{ valor: 100 }, { valor: 10 }, { valor: 900 }], 1000);
  assert.deepEqual(ordenado.map((c) => c.valor), [900, 100, 10]);
});
