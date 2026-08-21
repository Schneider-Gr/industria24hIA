import { test } from "vitest";
import assert from "node:assert/strict";
import { parseRespostaProduto } from "./langsmith-curadoria";

test("parseRespostaProduto: token APROVADO na primeira linha", () => {
  const r = parseRespostaProduto("APROVADO\nProduto completo, sem pendências.");
  assert.equal(r?.decisaoSugerida, "aprovado");
  assert.equal(r?.texto, "Produto completo, sem pendências.");
});

test("parseRespostaProduto: token SUGESTAO (com ou sem cedilha) na primeira linha", () => {
  const r1 = parseRespostaProduto("SUGESTAO\nAdicione mais fotos do produto.");
  assert.equal(r1?.decisaoSugerida, "sugestao");

  const r2 = parseRespostaProduto("SUGESTÃO\nDescrição muito curta.");
  assert.equal(r2?.decisaoSugerida, "sugestao");
});

test("parseRespostaProduto: token REPROVADO na primeira linha", () => {
  const r = parseRespostaProduto("REPROVADO\nSem nenhuma imagem e sem descrição.");
  assert.equal(r?.decisaoSugerida, "reprovado");
});

test("parseRespostaProduto: ignora espaços e caixa ao redor do token", () => {
  const r = parseRespostaProduto("  aprovado  \nTexto do parecer.");
  assert.equal(r?.decisaoSugerida, "aprovado");
});

test("parseRespostaProduto: sem token reconhecido descarta o parecer (null)", () => {
  const r = parseRespostaProduto("Não sei responder isso.");
  assert.equal(r, null);
});

test("parseRespostaProduto: resposta vazia descarta o parecer (null)", () => {
  assert.equal(parseRespostaProduto(""), null);
  assert.equal(parseRespostaProduto("   "), null);
});

test("parseRespostaProduto: token sem texto de parecer depois ainda é válido com texto vazio", () => {
  const r = parseRespostaProduto("APROVADO");
  assert.equal(r?.decisaoSugerida, "aprovado");
  assert.equal(r?.texto, "");
});
