import { test } from "vitest";
import assert from "node:assert/strict";
import { sanitizarPersona } from "./systemPrompt";

// A persona passa a chegar do cliente (LP de captação abre o widget já como
// seller — issue #542), então ela precisa ser validada contra a mesma lista
// do check de bot_conversas.persona antes de virar insert. Valor estranho
// não pode derrubar a criação da conversa: cai para null e o bot pergunta,
// como sempre fez.
test("sanitizarPersona aceita as personas do schema", () => {
  assert.equal(sanitizarPersona("seller"), "seller");
  assert.equal(sanitizarPersona("consumidor"), "consumidor");
  assert.equal(sanitizarPersona("motorista"), "motorista");
  assert.equal(sanitizarPersona("afiliado"), "afiliado");
});

test("sanitizarPersona devolve null para valor fora da lista", () => {
  assert.equal(sanitizarPersona("admin"), null);
  assert.equal(sanitizarPersona("Seller"), null);
  assert.equal(sanitizarPersona(""), null);
  assert.equal(sanitizarPersona(undefined), null);
  assert.equal(sanitizarPersona(null), null);
  assert.equal(sanitizarPersona(42), null);
});
