import assert from "node:assert/strict";
import { test } from "vitest";
import { validarCadastroTransportadora } from "./cadastro";

const base = { nome: "Jadlog", pesoMin: null, pesoMax: 30, valorMin: null, valorMax: null, fatorCubagem: 6000 };

test("cadastro válido não tem erro", () => {
  assert.deepEqual(validarCadastroTransportadora(base, { modoAvancado: true }), {});
});

test("nome obrigatório", () => {
  assert.match(validarCadastroTransportadora({ ...base, nome: "  " }, { modoAvancado: false }).nome ?? "", /obrigatório/);
});

test("mínimo maior que máximo aponta o campo", () => {
  const e = validarCadastroTransportadora({ ...base, pesoMin: 50, pesoMax: 30, valorMin: 900, valorMax: 100 }, { modoAvancado: false });
  assert.ok(e.pesoMin);
  assert.ok(e.valorMin);
});

test("fator de cubagem obrigatório só no modo avançado", () => {
  const sem = { ...base, fatorCubagem: null };
  assert.ok(validarCadastroTransportadora(sem, { modoAvancado: true }).fatorCubagem);
  assert.equal(validarCadastroTransportadora(sem, { modoAvancado: false }).fatorCubagem, undefined);
});

test("limite vazio significa sem limite; negativo é erro", () => {
  assert.deepEqual(validarCadastroTransportadora({ ...base, pesoMax: null }, { modoAvancado: true }), {});
  assert.ok(validarCadastroTransportadora({ ...base, pesoMax: -1 }, { modoAvancado: true }).pesoMax);
});
