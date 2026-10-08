import assert from "node:assert/strict";
import { test } from "vitest";
import { BAIRROS_MANAUS } from "./bairros-manaus";
import { MUNICIPIOS } from "./municipios";
import { IBGE_MANAUS, ZONAS_MANAUS, municipioDoCep, resumoArea, ufDoCep, validarArea } from "./area";

test("as seis zonas somam os 64 bairros oficiais, sem repetir", () => {
  const todos = ZONAS_MANAUS.flatMap((z) => z.bairros);
  assert.equal(todos.length, 64);
  assert.deepEqual([...todos].sort(), [...BAIRROS_MANAUS].sort());
});

test("municípios: 62 do AM, 22 do AC, faixas sem sobreposição", () => {
  assert.equal(MUNICIPIOS.filter((m) => m.uf === "AM").length, 62);
  assert.equal(MUNICIPIOS.filter((m) => m.uf === "AC").length, 22);
  const faixas = MUNICIPIOS.flatMap((m) => m.faixas.map((f) => [...f])).sort((a, b) => a[0] - b[0]);
  for (let i = 1; i < faixas.length; i++) assert.ok(faixas[i][0] > faixas[i - 1][1]);
});

test("estado e cidade saem do CEP", () => {
  assert.equal(municipioDoCep("69010-060")?.nome, "Manaus");
  assert.equal(municipioDoCep("69900-000")?.nome, "Rio Branco");
  assert.equal(ufDoCep("69415000"), "AM");
  assert.equal(ufDoCep("69980-000"), "AC");
  assert.equal(ufDoCep("69301-000"), "XX"); // Boa Vista/RR fica no meio da faixa do AM
  assert.equal(ufDoCep("90010-000"), "XX");
  assert.equal(ufDoCep("6901"), null);
});

test("validarArea: cidades do estado do CEP e bairros só no Amazonas", () => {
  const iranduba = MUNICIPIOS.find((m) => m.nome === "Iranduba")!.ibge;
  const rioBranco = MUNICIPIOS.find((m) => m.nome === "Rio Branco")!.ibge;

  assert.deepEqual(validarArea({ cep: "69010-060", cidades: [iranduba], bairros: ["Centro", "centro", "Aleixo"] }), {
    ok: true, uf: "AM", cidades: [iranduba], bairros: ["Centro", "Aleixo"],
  });
  assert.equal(validarArea({ cep: "69010-060", cidades: [rioBranco], bairros: [] }).ok, false);
  assert.equal(validarArea({ cep: "69010-060", cidades: [], bairros: ["Bairro Inventado"] }).ok, false);
  // Acre não tem bairros; o que vier é descartado.
  assert.deepEqual(validarArea({ cep: "69900-000", cidades: [rioBranco], bairros: ["Centro"] }), {
    ok: true, uf: "AC", cidades: [rioBranco], bairros: [],
  });
  // Estado não habilitado: cadastro passa, sem área.
  assert.deepEqual(validarArea({ cep: "90010-000", cidades: [iranduba], bairros: ["Centro"] }), {
    ok: true, uf: "XX", cidades: [], bairros: [],
  });
});

test("os 64 bairros marcados viram Manaus inteira", () => {
  const v = validarArea({ cep: "69010-060", cidades: [], bairros: [...BAIRROS_MANAUS] });
  assert.deepEqual(v, { ok: true, uf: "AM", cidades: [IBGE_MANAUS], bairros: [] });
});

test("resumoArea", () => {
  const iranduba = MUNICIPIOS.find((m) => m.nome === "Iranduba")!.ibge;
  assert.equal(resumoArea([iranduba], ["Centro", "Aleixo"]), "Manaus (2 bairros), Iranduba");
  assert.equal(resumoArea([IBGE_MANAUS], []), "Manaus");
  assert.equal(resumoArea([], []), null);
});
