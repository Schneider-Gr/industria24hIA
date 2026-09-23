import { test } from "vitest";
import assert from "node:assert/strict";
import { extrairOpcoes } from "./opcoesBot";
import { payloadInterativo } from "../whatsapp";

test("extrairOpcoes separa o texto da linha de opções", () => {
  const r = extrairOpcoes("Posso ajudar com seu pedido.\n[OPCOES: Rastrear pedido | Trocar um produto | Falar com humano]");
  assert.deepEqual(r, { texto: "Posso ajudar com seu pedido.", opcoes: ["Rastrear pedido", "Trocar um produto", "Falar com humano"] });
});

test("extrairOpcoes sem linha de opções devolve o texto intacto", () => {
  assert.deepEqual(extrairOpcoes("  Qual o número do pedido?  "), { texto: "Qual o número do pedido?", opcoes: [] });
});

test("extrairOpcoes descarta vazias e repetidas, corta rótulo longo e limita a 10", () => {
  const muitas = Array.from({ length: 12 }, (_, i) => `op${i}`).join(" | ");
  assert.equal(extrairOpcoes(`x\n[OPCOES: ${muitas}]`).opcoes.length, 10);
  assert.deepEqual(extrairOpcoes("x [opcoes: A |  | A | " + "B".repeat(30) + "]").opcoes, ["A", "B".repeat(24)]);
});

test("extrairOpcoes só pega a linha no fim (colchete no meio é texto)", () => {
  assert.deepEqual(extrairOpcoes("Use [OPCOES: a] assim.\nFim").opcoes, []);
});

test("payloadInterativo: até 3 opções viram botões, 4+ viram lista, sem opções é texto", () => {
  const botoes = payloadInterativo("Oi", ["A", "B"]) as { type: string; action: { buttons: unknown[] } };
  assert.equal(botoes.type, "button");
  assert.equal(botoes.action.buttons.length, 2);
  const lista = payloadInterativo("Oi", ["Sou comprador", "Sou lojista", "Sou entregador", "Sou afiliado"]) as {
    type: string;
    action: { sections: { rows: unknown[] }[] };
  };
  assert.equal(lista.type, "list");
  assert.equal(lista.action.sections[0].rows.length, 4);
  assert.equal(payloadInterativo("Oi", []), null);
  assert.equal(payloadInterativo("x".repeat(1025), ["A"]), null);
});
