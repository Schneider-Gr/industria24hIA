import assert from "node:assert/strict";
import { test } from "vitest";
import { resolverLoteAfiliacoes } from "./afiliado-lote";

test("cria afiliação apenas para produtos novos e elegíveis", () => {
  const produtos = [
    { id: "p1", loja_id: "l1", porcentagem_afiliado: 5, permite_afiliacao: true },
    { id: "p2", loja_id: "l1", porcentagem_afiliado: 12, permite_afiliacao: true },
    { id: "p3", loja_id: "l2", porcentagem_afiliado: 8, permite_afiliacao: true },
  ];
  const jaAfiliados = new Set(["p2"]);

  const resultado = resolverLoteAfiliacoes(produtos, jaAfiliados);

  assert.deepEqual(
    resultado.map((r) => r.produto_id),
    ["p1", "p3"],
  );
});

test("ignora produto que não permite mais afiliação, mesmo se não afiliado", () => {
  const produtos = [
    { id: "p1", loja_id: "l1", porcentagem_afiliado: 5, permite_afiliacao: false },
  ];

  const resultado = resolverLoteAfiliacoes(produtos, new Set());

  assert.equal(resultado.length, 0);
});

test("cada afiliação carrega o percentual do próprio produto, nunca um valor único do lote", () => {
  const produtos = [
    { id: "p1", loja_id: "l1", porcentagem_afiliado: 5, permite_afiliacao: true },
    { id: "p2", loja_id: "l2", porcentagem_afiliado: 12, permite_afiliacao: true },
  ];

  const resultado = resolverLoteAfiliacoes(produtos, new Set());

  assert.equal(resultado.find((r) => r.produto_id === "p1")?.porcentagem, 5);
  assert.equal(resultado.find((r) => r.produto_id === "p2")?.porcentagem, 12);
});

test("usa 5% como default quando porcentagem_afiliado é null", () => {
  const produtos = [
    { id: "p1", loja_id: "l1", porcentagem_afiliado: null, permite_afiliacao: true },
  ];

  const resultado = resolverLoteAfiliacoes(produtos, new Set());

  assert.equal(resultado[0].porcentagem, 5);
});
