import assert from "node:assert/strict";
import { test } from "vitest";
import { parseTabelaFrete } from "./parser-tabela-frete";

test("parseTabelaFrete converte linha da planilha modelo em faixa de largura mínima", () => {
  const resultado = parseTabelaFrete([
    {
      "CEP origem": "14095-240",
      "CEP destino": "04549-000",
      Volume: "1.0",
      "Peso (KG)": "0.3",
      "Valor Atual Frete": "27.8",
    },
  ]);
  assert.equal(resultado.corrigidas.length, 1);
  assert.equal(resultado.bloqueantes.length, 0);
  assert.deepEqual(resultado.corrigidas[0], {
    cepDestinoInicial: 4549000,
    cepDestinoFinal: 4549000,
    pesoMin: 0.3,
    pesoMax: 0.3,
    valor: 27.8,
  });
});

test("parseTabelaFrete normaliza CEP com máscara e espaços (auto-correção)", () => {
  const resultado = parseTabelaFrete([
    { "CEP destino": " 04549-000 ", "Peso (KG)": "1", "Valor Atual Frete": "10" },
  ]);
  assert.equal(resultado.bloqueantes.length, 0);
  assert.equal(resultado.corrigidas[0].cepDestinoInicial, 4549000);
});

test("parseTabelaFrete bloqueia CEP com dígitos insuficientes, não grava a linha", () => {
  const resultado = parseTabelaFrete([
    { "CEP destino": "123", "Peso (KG)": "1", "Valor Atual Frete": "10" },
  ]);
  assert.equal(resultado.corrigidas.length, 0);
  assert.equal(resultado.bloqueantes.length, 1);
  assert.match(resultado.bloqueantes[0].motivo, /cep/i);
});

test("parseTabelaFrete bloqueia valor de frete ausente ou não numérico", () => {
  const resultado = parseTabelaFrete([
    { "CEP destino": "04549-000", "Peso (KG)": "1", "Valor Atual Frete": "" },
  ]);
  assert.equal(resultado.corrigidas.length, 0);
  assert.equal(resultado.bloqueantes.length, 1);
  assert.match(resultado.bloqueantes[0].motivo, /valor/i);
});

test("parseTabelaFrete assume peso 0 quando ausente (placeholder documentado)", () => {
  const resultado = parseTabelaFrete([{ "CEP destino": "04549-000", "Valor Atual Frete": "10" }]);
  assert.equal(resultado.corrigidas[0].pesoMin, 0);
  assert.equal(resultado.corrigidas[0].pesoMax, 0);
});

test("parseTabelaFrete continua as linhas válidas quando uma linha é bloqueante", () => {
  const resultado = parseTabelaFrete([
    { "CEP destino": "04549-000", "Peso (KG)": "1", "Valor Atual Frete": "10" },
    { "CEP destino": "abc", "Peso (KG)": "1", "Valor Atual Frete": "10" },
  ]);
  assert.equal(resultado.corrigidas.length, 1);
  assert.equal(resultado.bloqueantes.length, 1);
});
