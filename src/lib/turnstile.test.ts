import assert from "node:assert/strict";
import { test } from "vitest";
import { verificarTurnstile } from "./turnstile";
import { TURNSTILE_ATIVO } from "./turnstile-flag";

// Kill switch do Turnstile ligado (TURNSTILE_ATIVO = false — pedido do dono
// 2026-08-31): verificarTurnstile aceita qualquer request sem chamar o
// Cloudflare. Quando reativarem (flag = true), restaurar do histórico do git
// os testes de token válido/inválido/erro de rede.
test("verificarTurnstile: serviço inativo, aceita sem chamar o Cloudflare", async () => {
  assert.equal(TURNSTILE_ATIVO, false);
  const originalFetch = global.fetch;
  let chamou = false;
  global.fetch = (async () => {
    chamou = true;
    return new Response("{}", { status: 200 });
  }) as typeof fetch;
  try {
    assert.equal(await verificarTurnstile(null), true);
    assert.equal(await verificarTurnstile("token-qualquer"), true);
    assert.equal(chamou, false);
  } finally {
    global.fetch = originalFetch;
  }
});
