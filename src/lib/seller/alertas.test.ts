import assert from "node:assert/strict";
import { test } from "vitest";
import { montarAlertas, alertasNovos, lembrarVistos } from "./alertas";

const entrada = {
  cotacoes: [{ id: "c1", criado_em: "2026-09-28T12:00:00Z", produto: "Polpa de Cupuaçu", quantidade: 10, lugar: "São Geraldo, Manaus" }],
  disputas: [{ id: "d1", aberta_em: "2026-09-28T11:00:00Z", motivo: "produto_avariado", descricao: "Chegou amassado" }],
  mensagens: [
    { id: "m1", conversa_id: "v1", created_at: "2026-09-28T13:00:00Z", corpo: "Tem entrega amanhã?" },
    { id: "m2", conversa_id: "v1", created_at: "2026-09-28T13:01:00Z", corpo: "x".repeat(200) },
  ],
};

test("montarAlertas junta cotação, disputa e mensagem, mais recente primeiro, com link para responder", () => {
  const a = montarAlertas(entrada);
  assert.deepEqual(a.map((x) => x.chave), ["mensagem-m2", "mensagem-m1", "cotacao-c1", "disputa-d1"]);
  assert.equal(a.find((x) => x.chave === "cotacao-c1")!.href, "/seller/cotacoes-frete/c1");
  assert.equal(a.find((x) => x.chave === "disputa-d1")!.href, "/seller/disputas/d1");
  assert.equal(a.find((x) => x.chave === "mensagem-m1")!.href, "/seller/mensagens/v1");
  assert.match(a.find((x) => x.chave === "cotacao-c1")!.trecho, /10 un\..*São Geraldo/);
  assert.ok(a[0].trecho.length <= 121, "trecho da mensagem é cortado");
});

test("alertasNovos só devolve o que ainda não foi visto", () => {
  const a = montarAlertas(entrada);
  const novos = alertasNovos(a, new Set(["mensagem-m1", "cotacao-c1"]));
  assert.deepEqual(novos.map((x) => x.chave), ["mensagem-m2", "disputa-d1"]);
});

test("lembrarVistos guarda os mais recentes sem crescer para sempre", () => {
  const muitos = Array.from({ length: 250 }, (_, i) => `k${i}`);
  const vistos = lembrarVistos(muitos, ["novo"], 200);
  assert.equal(vistos.length, 200);
  assert.equal(vistos.at(-1), "novo");
  assert.ok(!vistos.includes("k0"));
});
