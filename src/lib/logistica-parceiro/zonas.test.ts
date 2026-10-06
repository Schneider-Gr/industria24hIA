import { test } from "vitest";
import assert from "node:assert/strict";
import { validarZona, zonaDasLinhas } from "./zonas";

test("bairros e prefixos válidos, sem repetição", () => {
  const v = validarZona({ bairros: ["Centro", "CENTRO", "Parque Dez"], prefixos: "69050, 69005 69050" });
  assert.deepEqual(v, { ok: true, bairros: ["Centro", "Parque 10 de Novembro"], prefixos: ["69005", "69050"] });
});

test("zona vazia é válida (volta a atender tudo)", () => {
  assert.deepEqual(validarZona({ bairros: [], prefixos: "  " }), { ok: true, bairros: [], prefixos: [] });
});

test("prefixo com tamanho errado ou com letra é recusado", () => {
  for (const p of ["6900", "690501", "69A00", "69050-000"]) {
    const v = validarZona({ bairros: [], prefixos: p });
    assert.equal(v.ok, false, p);
  }
});

test("bairro fora da lista oficial é recusado", () => {
  const v = validarZona({ bairros: ["Centro", "Iranduba"], prefixos: "" });
  assert.equal(v.ok, false);
  assert.match((v as { erro: string }).erro, /Iranduba/);
});

test("linhas do banco voltam com o nome da lei", () => {
  const z = zonaDasLinhas([
    { tipo: "cep_prefixo", valor: "69050" },
    { tipo: "bairro", valor: "sao jose operario" },
    { tipo: "bairro", valor: "taruma acu" },
    { tipo: "cep_prefixo", valor: "69005" },
  ]);
  assert.deepEqual(z, { bairros: ["São José Operário", "Tarumã-Açu"], prefixos: ["69005", "69050"] });
});
