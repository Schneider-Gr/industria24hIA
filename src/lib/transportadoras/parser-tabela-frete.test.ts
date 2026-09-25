import assert from "node:assert/strict";
import { test } from "vitest";
import { detectarSobreposicao, parseTabelaFaixas } from "./parser-tabela-frete";

const linha = (extra: Record<string, string> = {}) => ({
  CepInicial: "69000-000",
  CepFinal: "69099-999",
  PesoInicial: "0",
  PesoFinal: "10",
  Valor: "20,00",
  ...extra,
});

test("faixa real: não vira ponto exato, vazios valem zero e prazo fica vazio", () => {
  const r = parseTabelaFaixas([linha()]);
  assert.equal(r.recusa, undefined);
  assert.deepEqual(r.erros, []);
  assert.equal(r.faixas.length, 1);
  assert.deepEqual(r.faixas[0], {
    numero: 2,
    cepOrigemInicial: null,
    cepOrigemFinal: null,
    cepDestinoInicial: 69000000,
    cepDestinoFinal: 69099999,
    pesoMin: 0,
    pesoMax: 10,
    valor: 20,
    prazoMin: null,
    prazoMax: null,
    adValorem: 0,
    kgAdicional: 0,
    icms: 0,
    freteMinimo: 0,
    taxaFixa: 0,
  });
});

test("formato Bubble ampliado com todas as colunas e números com vírgula, ponto e aspas", () => {
  const r = parseTabelaFaixas([
    linha({
      "Prazo Entrega Maximo": "5",
      "Prazo Entrega Minimo": "2",
      AdValorem: "1,5",
      KgAdicional: '"1.50"',
      ICMS: "12",
      "Frete Minimo": "15",
      "Taxa Fixa por Envio": "3",
      CepOrigemInicial: "69075000",
      CepOrigemFinal: "69075999",
      Valor: "1.234,56",
    }),
  ]);
  assert.deepEqual(r.erros, []);
  const f = r.faixas[0];
  assert.equal(f.valor, 1234.56);
  assert.equal(f.prazoMin, 2);
  assert.equal(f.prazoMax, 5);
  assert.equal(f.adValorem, 1.5);
  assert.equal(f.kgAdicional, 1.5);
  assert.equal(f.icms, 12);
  assert.equal(f.freteMinimo, 15);
  assert.equal(f.taxaFixa, 3);
  assert.equal(f.cepOrigemInicial, 69075000);
  assert.equal(f.cepOrigemFinal, 69075999);
});

test("formato antigo do Bubble (Prazo Max/Prazo Min) é aceito", () => {
  const r = parseTabelaFaixas([linha({ "Prazo Max": "7", "Prazo Min": "3" })]);
  assert.deepEqual(r.erros, []);
  assert.equal(r.faixas[0].prazoMin, 3);
  assert.equal(r.faixas[0].prazoMax, 7);
});

test("cabeçalho sem diferenciar maiúsculas, acento ou espaço", () => {
  const r = parseTabelaFaixas([
    { "cep inicial": "69000000", "CEP FINAL": "69000999", "peso inicial": "0", "Peso Final": "5", "valor": "8", "Frete Mínimo": "4" },
  ]);
  assert.deepEqual(r.erros, []);
  assert.equal(r.faixas[0].freteMinimo, 4);
});

test("planilha de cotação por envio é recusada inteira", () => {
  const r = parseTabelaFaixas([
    { "CEP origem": "14095-240", "CEP destino": "04549-000", Volume: "1", "Peso (KG)": "0.3", "Valor Atual Frete": "27.8" },
  ]);
  assert.match(r.recusa ?? "", /cotação por envio/);
  assert.equal(r.faixas.length, 0);
});

test("planilha sem as colunas obrigatórias é recusada", () => {
  const r = parseTabelaFaixas([{ Nome: "x", Valor: "1" }]);
  assert.match(r.recusa ?? "", /CepInicial/);
});

test("erros por linha: CEP inválido, invertido, peso invertido, prazo invertido, valor negativo e não numérico", () => {
  const r = parseTabelaFaixas([
    linha({ CepInicial: "6900" }),
    linha({ CepInicial: "69099999", CepFinal: "69000000" }),
    linha({ PesoInicial: "10", PesoFinal: "5" }),
    linha({ "Prazo Entrega Minimo": "5", "Prazo Entrega Maximo": "2" }),
    linha({ Valor: "-1" }),
    linha({ Valor: "abc" }),
    linha({ CepOrigemInicial: "69075000" }),
    linha({ ICMS: "100" }),
    linha({ PesoFinal: "" }),
  ]);
  assert.equal(r.faixas.length, 0);
  assert.deepEqual(
    r.erros.map((e) => e.numero),
    [2, 3, 4, 5, 6, 7, 8, 9, 10],
  );
  assert.match(r.erros[0].motivo, /CEP/);
  assert.match(r.erros[1].motivo, /CEP inicial maior/);
  assert.match(r.erros[2].motivo, /peso/i);
  assert.match(r.erros[3].motivo, /prazo/i);
  assert.match(r.erros[4].motivo, /Valor/);
  assert.match(r.erros[6].motivo, /origem/i);
});

test("linha com Valor vazio ou Atende = N é ignorada e contada", () => {
  const r = parseTabelaFaixas([linha({ Valor: "" }), linha({ Atende: "N" }), linha({ Atende: "S" })]);
  assert.equal(r.ignoradas, 2);
  assert.equal(r.faixas.length, 1);
  assert.deepEqual(r.erros, []);
});

test("mais de 15.000 linhas é recusado inteiro", () => {
  const linhas = Array.from({ length: 15001 }, () => linha());
  const r = parseTabelaFaixas(linhas);
  assert.match(r.recusa ?? "", /15\.000/);
  assert.equal(r.faixas.length, 0);
});

test("aviso quando nenhuma faixa tem KgAdicional", () => {
  const sem = parseTabelaFaixas([linha(), linha({ PesoInicial: "10.001", PesoFinal: "30" })]);
  assert.match(sem.avisos.join(" "), /acima de 30 kg/);
  const com = parseTabelaFaixas([linha({ KgAdicional: "1,5" })]);
  assert.deepEqual(com.avisos, []);
});

test("sobreposição: mesmo destino e peso, faixa de CEP contida, origem vazia cobre qualquer origem", () => {
  const { faixas } = parseTabelaFaixas([
    linha(),
    linha({ CepInicial: "69050000", CepFinal: "69050999", Valor: "35" }),
    linha({ PesoInicial: "10.001", PesoFinal: "30" }),
    linha({ CepInicial: "69100000", CepFinal: "69199999" }),
  ]);
  assert.deepEqual(detectarSobreposicao(faixas), [{ a: 2, b: 3 }]);
});

test("sobreposição: origens disjuntas não conflitam; limites inclusivos conflitam", () => {
  const { faixas } = parseTabelaFaixas([
    linha({ CepOrigemInicial: "69000000", CepOrigemFinal: "69000999" }),
    linha({ CepOrigemInicial: "69001000", CepOrigemFinal: "69001999" }),
    linha({ CepOrigemInicial: "69000000", CepOrigemFinal: "69000999", PesoInicial: "10", PesoFinal: "20" }),
  ]);
  assert.deepEqual(detectarSobreposicao(faixas), [{ a: 2, b: 4 }]);
});
