import { test } from "vitest";
import assert from "node:assert/strict";
import { BAIRROS_MANAUS, bairroOficial, normalizarBairro } from "./bairros-manaus";

test("64 bairros, sem repetição, em ordem alfabética", () => {
  assert.equal(BAIRROS_MANAUS.length, 64);
  const chaves = BAIRROS_MANAUS.map(normalizarBairro);
  assert.equal(new Set(chaves).size, 64);
  assert.deepEqual(chaves, [...chaves].sort());
});

test("acento, maiúscula e espaço sobrando não impedem o casamento", () => {
  assert.equal(bairroOficial("  ADRIANOPOLIS "), "Adrianópolis");
  assert.equal(bairroOficial("são josé operário"), "São José Operário");
  assert.equal(bairroOficial("Taruma-Acu"), "Tarumã-Açu");
  assert.equal(bairroOficial("Tarumã"), "Tarumã");
});

test("apelidos conhecidos apontam para o nome da lei", () => {
  assert.equal(bairroOficial("Aparecida"), "Nossa Senhora Aparecida");
  assert.equal(bairroOficial("Parque Dez"), "Parque 10 de Novembro");
  assert.equal(bairroOficial("Dom Pedro"), "Dom Pedro I");
  assert.equal(bairroOficial("Distrito Industrial"), "Distrito Industrial I");
});

test("o que não é bairro oficial devolve null", () => {
  for (const t of ["Vieiralves", "Iranduba", "", null, undefined]) {
    assert.equal(bairroOficial(t), null, String(t));
  }
});
