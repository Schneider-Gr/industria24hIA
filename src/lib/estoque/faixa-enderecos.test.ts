// O que este teste protege: a prévia que a pessoa vê antes de gravar é a mesma
// conta que o servidor faz. Se a expansão divergir, alguém confirma "360
// posições" e o galpão nasce com outra coisa — e posição errada é como a
// mercadoria se perde.
import assert from "node:assert/strict";
import { test } from "vitest";
import {
  expandirFaixa,
  FaixaGrandeDemais,
  gerarPosicoes,
  MAX_POSICOES_POR_LOTE,
  ParteInvalida,
} from "./faixa-enderecos";

test("expandirFaixa cobre lista, faixa numérica e faixa de letra", () => {
  assert.deepEqual(expandirFaixa("A,B,C"), ["A", "B", "C"]);
  assert.deepEqual(expandirFaixa("1-5"), ["1", "2", "3", "4", "5"]);
  assert.deepEqual(expandirFaixa("A-D"), ["A", "B", "C", "D"]);
  // Mistura de formas na mesma entrada.
  assert.deepEqual(expandirFaixa("DOCA, 1-3"), ["DOCA", "1", "2", "3"]);
});

test("expandirFaixa normaliza como o banco normaliza", () => {
  // O `codigo` é coluna gerada em maiúsculas: aceitar "a" e "A" como distintos
  // criaria dois nomes para a mesma posição.
  assert.deepEqual(expandirFaixa("a,A"), ["A"]);
  assert.deepEqual(expandirFaixa("  b  ,  b "), ["B"]);
  // Faixa invertida é erro de digitação, não lista vazia.
  assert.deepEqual(expandirFaixa("5-1"), ["1", "2", "3", "4", "5"]);
  // Entrada vazia ou só vírgulas não inventa parte nenhuma.
  assert.deepEqual(expandirFaixa(" , , "), []);
});

test("gerarPosicoes faz o produto cartesiano e monta o código", () => {
  const r = gerarPosicoes({ ruas: "A,B", predios: "1-2", niveis: "1", apartamentos: "1" });
  assert.ok(r.ok);
  assert.equal(r.posicoes.length, 4);
  assert.deepEqual(
    r.posicoes.map((p) => p.codigo),
    ["A-1-1-1", "A-2-1-1", "B-1-1-1", "B-2-1-1"],
  );
});

test("gerarPosicoes recusa faixa vazia nomeando o campo", () => {
  const r = gerarPosicoes({ ruas: "A", predios: "", niveis: "1", apartamentos: "1" });
  assert.equal(r.ok, false);
  assert.ok(!r.ok && r.erro.includes("prédio"));
});

test("gerarPosicoes recusa lote acima do teto", () => {
  // "1-99999" digitado por engano não pode virar uma transação de meia hora.
  const r = gerarPosicoes({ ruas: "A", predios: "1-99999", niveis: "1", apartamentos: "1" });
  assert.equal(r.ok, false);
  assert.ok(!r.ok && r.erro.includes(String(MAX_POSICOES_POR_LOTE)));
});

test("o exemplo do galpão de três ruas fecha em 360 posições", () => {
  const r = gerarPosicoes({ ruas: "A-C", predios: "1-10", niveis: "1-4", apartamentos: "1-3" });
  assert.ok(r.ok);
  assert.equal(r.posicoes.length, 360);
  assert.equal(r.posicoes[0].codigo, "A-1-1-1");
  assert.equal(r.posicoes.at(-1)!.codigo, "C-10-4-3");
  // Nenhum código repetido: o índice único do banco recusaria o lote inteiro.
  assert.equal(new Set(r.posicoes.map((p) => p.codigo)).size, 360);
});

test("faixa gigante é barrada ANTES de ser materializada", () => {
  // Sem esta guarda, `1-999999999` aloca um bilhão de strings e derruba o
  // processo antes de chegar ao teto — e na tela a prévia roda a cada tecla,
  // então a aba congela enquanto a pessoa ainda está digitando.
  const inicio = Date.now();
  assert.throws(() => expandirFaixa("1-999999999"), FaixaGrandeDemais);
  assert.ok(Date.now() - inicio < 1000, "a recusa tem de ser imediata, não após materializar");

  const r = gerarPosicoes({ ruas: "A", predios: "1-999999999", niveis: "1", apartamentos: "1" });
  assert.equal(r.ok, false);
  assert.ok(!r.ok && r.erro.includes("999999999"));
});

test("parte com hífen é recusada, porque quebraria a unicidade do código", () => {
  // rua "AA-BB" + prédio "CC" e rua "AA" + prédio "BB-CC" gerariam o mesmo
  // código AA-BB-CC-1-1: dois nomes para a mesma posição física.
  assert.throws(() => expandirFaixa("AA-BB"), ParteInvalida);

  const um = gerarPosicoes({ ruas: "AA-BB", predios: "CC", niveis: "1", apartamentos: "1" });
  assert.equal(um.ok, false);
  assert.ok(!um.ok && um.erro.includes("hífen"));

  // A faixa de letra única e a numérica continuam valendo: o hífen delas é
  // separador de faixa, não parte do nome.
  assert.deepEqual(expandirFaixa("A-C"), ["A", "B", "C"]);
  assert.deepEqual(expandirFaixa("1-3"), ["1", "2", "3"]);
});
