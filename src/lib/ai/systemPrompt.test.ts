import { test } from "vitest";
import assert from "node:assert/strict";
import { OPCOES_MOTIVO, buildSystemPrompt, sanitizarPersona } from "./systemPrompt";
import { extrairOpcoes } from "./opcoesBot";
import { motivosDisponiveis } from "../disputas";

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

// #746: o bot oferece os motivos de devolução como botões gerados de disputas.ts.
test("motivos de devolução: todo motivo da tela vira botão de até 20 caracteres", () => {
  const { opcoes } = extrairOpcoes(`Qual o motivo?\n${OPCOES_MOTIVO}`);
  const todos = motivosDisponiveis(true);
  assert.equal(opcoes.length, todos.length);
  for (const m of todos) {
    assert.ok(opcoes.includes(m.curto), m.value);
    assert.ok(m.curto.length <= 20, m.curto);
  }
  assert.equal(opcoes.at(-1), "Outro motivo");
  const prompt = buildSystemPrompt("consumidor");
  for (const m of todos) assert.ok(prompt.includes(`"${m.curto}" = ${m.value}`), m.value);
});
