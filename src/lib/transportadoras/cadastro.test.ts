import assert from "node:assert/strict";
import { test } from "vitest";
import { cadastroDoForm, validarCadastroTransportadora } from "./cadastro";

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

test("cadastroDoForm converte vírgula, vazio vira null e aponta erros", () => {
  const fd = new FormData();
  fd.set("nome", " Braspress ");
  fd.set("peso_max", "1000,5");
  fd.set("fator_cubagem", "300");
  fd.set("altura_max", "");
  fd.set("url_rastreio", "https://rastreio.exemplo/");
  const { erros, payload } = cadastroDoForm(fd);
  assert.deepEqual(erros, {});
  assert.equal(payload.nome, "Braspress");
  assert.equal(payload.peso_max, 1000.5);
  assert.equal(payload.altura_max, null);

  const ruim = new FormData();
  ruim.set("nome", "X");
  ruim.set("largura_max", "-2");
  ruim.set("url_rastreio", "rastreio.com");
  const r = cadastroDoForm(ruim);
  assert.ok(Object.keys(r.erros).length >= 2);
});
