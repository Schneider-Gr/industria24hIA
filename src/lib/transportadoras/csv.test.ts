import assert from "node:assert/strict";
import { test } from "vitest";
import { parseCsvLinhas } from "./csv";

test("parseCsvLinhas usa a primeira linha como cabeçalho", () => {
  const linhas = parseCsvLinhas("nome,fonte,prazo_dias\nEntrega Rápida,interna,3\n");
  assert.deepEqual(linhas, [{ nome: "Entrega Rápida", fonte: "interna", prazo_dias: "3" }]);
});

test("parseCsvLinhas aceita separador ponto-e-vírgula (padrão Excel BR)", () => {
  const linhas = parseCsvLinhas("nome;fonte\nX;interna\n");
  assert.deepEqual(linhas, [{ nome: "X", fonte: "interna" }]);
});

test("parseCsvLinhas ignora linhas em branco", () => {
  const linhas = parseCsvLinhas("nome,fonte\nA,interna\n\nB,interna\n");
  assert.equal(linhas.length, 2);
});

test("parseCsvLinhas respeita campo entre aspas com vírgula interna", () => {
  const linhas = parseCsvLinhas('nome,fonte\n"Transportadora, Ltda",interna\n');
  assert.equal(linhas[0].nome, "Transportadora, Ltda");
});
