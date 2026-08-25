import { test } from "vitest";
import assert from "node:assert/strict";
import { respostaErroGenerico } from "./erro-generico";

test("respostaErroGenerico não vaza error.message no body da resposta", async () => {
  const erroSensivel = new Error("column pedidos.valor_recebido_industria does not exist");

  const resposta = respostaErroGenerico(erroSensivel, 500);
  const body = await resposta.json();

  assert.equal(resposta.status, 500);
  assert.equal(body.error, "Erro ao processar requisição");
  assert.ok(!JSON.stringify(body).includes("column pedidos"));
});

test("respostaErroGenerico respeita o status HTTP informado", async () => {
  const resposta = respostaErroGenerico(new Error("x"), 503);
  assert.equal(resposta.status, 503);
});
