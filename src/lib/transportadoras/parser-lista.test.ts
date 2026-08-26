import assert from "node:assert/strict";
import { test } from "vitest";
import { parseListaTransportadoras } from "./parser-lista";

test("parseListaTransportadoras aceita linhas válidas", () => {
  const resultado = parseListaTransportadoras([
    { nome: "Entrega Rápida", fonte: "interna", prazo_dias: "3" },
    { nome: "Correios Parceiro", fonte: "tabela_importada", prazo_dias: "" },
  ]);
  assert.equal(resultado.validas.length, 2);
  assert.equal(resultado.rejeitadas.length, 0);
  assert.deepEqual(resultado.validas[0], { nome: "Entrega Rápida", fonte: "interna", prazoDias: 3 });
  assert.deepEqual(resultado.validas[1], { nome: "Correios Parceiro", fonte: "tabela_importada", prazoDias: null });
});

test("parseListaTransportadoras rejeita fonte fora do enum sem travar as válidas", () => {
  const resultado = parseListaTransportadoras([
    { nome: "Transportadora X", fonte: "invalida", prazo_dias: "1" },
    { nome: "Válida", fonte: "interna", prazo_dias: "2" },
  ]);
  assert.equal(resultado.validas.length, 1);
  assert.equal(resultado.rejeitadas.length, 1);
  assert.match(resultado.rejeitadas[0].motivo, /fonte/i);
});

test("parseListaTransportadoras rejeita linha sem nome", () => {
  const resultado = parseListaTransportadoras([{ nome: "", fonte: "interna", prazo_dias: "1" }]);
  assert.equal(resultado.validas.length, 0);
  assert.equal(resultado.rejeitadas.length, 1);
  assert.match(resultado.rejeitadas[0].motivo, /nome/i);
});

test("parseListaTransportadoras aceita prazo ausente ou zero", () => {
  const resultado = parseListaTransportadoras([{ nome: "Sem prazo", fonte: "interna", prazo_dias: "0" }]);
  assert.equal(resultado.validas[0].prazoDias, 0);
});
