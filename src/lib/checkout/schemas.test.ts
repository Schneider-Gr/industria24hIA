import { test } from "vitest";
import assert from "node:assert/strict";
import { itensCarrinhoSchema, cpfCnpjSchema, billingTypeSchema } from "./schemas";

const UUID = "11111111-1111-4111-8111-111111111111";
const UUID2 = "22222222-2222-4222-8222-222222222222";

test("itensCarrinhoSchema aceita um carrinho válido", () => {
  const r = itensCarrinhoSchema.safeParse([
    { produto_id: UUID, quantidade: 2, loja_id: UUID2 },
  ]);
  assert.equal(r.success, true);
});

test("itensCarrinhoSchema rejeita carrinho vazio", () => {
  const r = itensCarrinhoSchema.safeParse([]);
  assert.equal(r.success, false);
});

test("itensCarrinhoSchema rejeita quantidade não positiva", () => {
  const r = itensCarrinhoSchema.safeParse([{ produto_id: UUID, quantidade: 0, loja_id: UUID2 }]);
  assert.equal(r.success, false);
});

test("itensCarrinhoSchema rejeita produto_id que não é uuid", () => {
  const r = itensCarrinhoSchema.safeParse([
    { produto_id: "'; drop table produtos;--", quantidade: 1, loja_id: UUID2 },
  ]);
  assert.equal(r.success, false);
});

test("cpfCnpjSchema aceita CPF (11 dígitos) e CNPJ (14 dígitos)", () => {
  assert.equal(cpfCnpjSchema.safeParse("12345678901").success, true);
  assert.equal(cpfCnpjSchema.safeParse("12345678000199").success, true);
});

test("cpfCnpjSchema rejeita tamanho inválido", () => {
  assert.equal(cpfCnpjSchema.safeParse("123").success, false);
});

test("billingTypeSchema só aceita os três valores conhecidos", () => {
  assert.equal(billingTypeSchema.safeParse("PIX").success, true);
  assert.equal(billingTypeSchema.safeParse("DINHEIRO").success, false);
});
