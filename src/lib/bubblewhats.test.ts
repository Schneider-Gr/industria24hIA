// Envio via BubbleWhats: nunca finge sucesso sem configuração, e cada
// código de erro do gateway (401/408/422/502) vira um motivo distinto —
// misturar todos em "erro genérico" esconderia qual caso realmente ocorreu.

import assert from "node:assert/strict";
import { test } from "vitest";

const stub = (status: number, ok: boolean) => {
  globalThis.fetch = (async () => ({ ok, status })) as unknown as typeof fetch;
};

async function main() {
  delete process.env.BUBBLEWHATS_TOKEN;
  delete process.env.BUBBLEWHATS_API_URL;
  const semConfig = await import("./bubblewhats.ts?semconfig" as unknown as "./bubblewhats");
  assert.equal(semConfig.isBubblewhatsConfigured, false);
  assert.deepEqual(await semConfig.enviarBubblewhats("5511999999999", "oi"), {
    ok: false,
    motivo: "nao_configurado",
  });

  process.env.BUBBLEWHATS_TOKEN = "token-de-teste";
  process.env.BUBBLEWHATS_API_URL = "https://bubblewhats.example.com";
  const bw = await import("./bubblewhats.ts?comconfig" as unknown as "./bubblewhats");
  assert.equal(bw.isBubblewhatsConfigured, true);

  stub(200, true);
  assert.deepEqual(await bw.enviarBubblewhats("5511999999999", "oi"), { ok: true });

  stub(401, false);
  assert.deepEqual(await bw.enviarBubblewhats("5511999999999", "oi"), {
    ok: false,
    motivo: "token_invalido",
    status: 401,
  });

  stub(408, false);
  assert.deepEqual(await bw.enviarBubblewhats("5511999999999", "oi"), {
    ok: false,
    motivo: "numero_invalido_ou_timeout",
    status: 408,
  });

  stub(422, false);
  assert.deepEqual(await bw.enviarBubblewhats("5511999999999", "oi"), {
    ok: false,
    motivo: "parametro_invalido",
    status: 422,
  });

  stub(502, false);
  assert.deepEqual(await bw.enviarBubblewhats("5511999999999", "oi"), {
    ok: false,
    motivo: "aparelho_desconectado",
    status: 502,
  });

  stub(500, false);
  assert.deepEqual(await bw.enviarBubblewhats("5511999999999", "oi"), {
    ok: false,
    motivo: "erro_desconhecido",
    status: 500,
  });
}

test("enviarBubblewhats: no-op sem config e motivo distinto por código de erro", main);

test("templates de aviso de pedido: contêm os dados essenciais para o destinatário agir", async () => {
  const bw = await import("./bubblewhats.ts?templates" as unknown as "./bubblewhats");

  const saiu = bw.mensagemSaiuParaEntrega({ idVenda: "V123", linkPedido: "https://industria24.com.br/pedido/1" });
  assert.match(saiu, /V123/);
  assert.match(saiu, /https:\/\/industria24\.com\.br\/pedido\/1/);

  const disputaAberta = bw.mensagemDisputaAbertaLoja({
    idVenda: "V123",
    motivo: "produto_avariado",
    linkDisputa: "https://industria24.com.br/pedido/1/disputa",
  });
  assert.match(disputaAberta, /V123/);
  assert.match(disputaAberta, /produto_avariado/);

  const proposta = bw.mensagemPropostaResolucaoComprador({
    idVenda: "V123",
    linkDisputa: "https://industria24.com.br/pedido/1/disputa",
  });
  assert.match(proposta, /V123/);
  assert.match(proposta, /https:\/\/industria24\.com\.br\/pedido\/1\/disputa/);

  const decisaoComprador = bw.mensagemDecisaoDisputa({
    idVenda: "V123",
    decisao: "Reembolso integral",
    destinatario: "comprador",
    linkDisputa: "https://industria24.com.br/pedido/1/disputa",
  });
  assert.match(decisaoComprador, /Reembolso integral/);
  assert.doesNotMatch(decisaoComprador, /\(loja\)/);

  const decisaoLoja = bw.mensagemDecisaoDisputa({
    idVenda: "V123",
    decisao: "Reembolso integral",
    destinatario: "loja",
    linkDisputa: "https://industria24.com.br/pedido/1/disputa",
  });
  assert.match(decisaoLoja, /\(loja\)/);
});
