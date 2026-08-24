import assert from "node:assert/strict";
import { test } from "vitest";
import { normalizarTelefoneE164 } from "./uber-direct";

test("adiciona +55 quando o telefone só tem DDD+número (11 dígitos)", () => {
  assert.equal(normalizarTelefoneE164("92999990000"), "+5592999990000");
});

test("adiciona +55 quando o telefone só tem DDD+número (10 dígitos, fixo)", () => {
  assert.equal(normalizarTelefoneE164("9233330000"), "+559233330000");
});

test("mantém +55 já presente, só remove formatação", () => {
  assert.equal(normalizarTelefoneE164("+55 (92) 99999-0000"), "+5592999990000");
});

test("adiciona + quando já tem 55 na frente sem o +", () => {
  assert.equal(normalizarTelefoneE164("5592999990000"), "+5592999990000");
});

test("remove caracteres de formatação (parênteses, traço, espaço)", () => {
  assert.equal(normalizarTelefoneE164("(92) 99999-0000"), "+5592999990000");
});

test("string vazia ou nula vira string vazia (uber-direct.ts decide se envia)", () => {
  assert.equal(normalizarTelefoneE164(""), "");
  assert.equal(normalizarTelefoneE164(null), "");
  assert.equal(normalizarTelefoneE164(undefined), "");
});
