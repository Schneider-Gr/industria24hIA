// O que este teste protege: endereço impossível não pode virar alerta diário.
// Em produção, 4 dos 10 carrinhos abandonados usavam `@example.com`, o provedor
// recusava, o cron registrava erro, e o alerta resultante ficou dias sem ninguém
// ver — escondendo falha de verdade no meio do ruído.
import assert from "node:assert/strict";
import { test } from "vitest";
import { ehDestinatarioNaoEntregavel } from "./email";

test("reconhece os domínios reservados pela RFC 2606", () => {
  for (const email of [
    "alguem@example.com",
    "ALGUEM@EXAMPLE.COM",
    "a@example.net",
    "a@example.org",
    "a@meu.test",
    "a@coisa.invalid",
    "a@localhost",
    "a@app.localhost",
  ]) {
    assert.equal(ehDestinatarioNaoEntregavel(email), true, email);
  }
});

test("não confunde domínio real com reservado", () => {
  for (const email of [
    "alguem@gmail.com",
    "contato@industria24.com.br",
    // Contém a palavra, mas não é o domínio reservado.
    "a@exemplo.com",
    "a@testecom.com.br",
    "a@example.com.br",
  ]) {
    assert.equal(ehDestinatarioNaoEntregavel(email), false, email);
  }
});

test("endereço sem domínio é tratado como não entregável", () => {
  assert.equal(ehDestinatarioNaoEntregavel("semarroba"), true);
  assert.equal(ehDestinatarioNaoEntregavel(""), true);
});
