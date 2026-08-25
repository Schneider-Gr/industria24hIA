import assert from "node:assert/strict";
import { test } from "vitest";
import { verificarTurnstile } from "./turnstile";

test("verificarTurnstile: sem token, com secret configurada, rejeita", async () => {
  process.env.TURNSTILE_SECRET_KEY = "secret-de-teste";
  const resultado = await verificarTurnstile(null);
  assert.equal(resultado, false);
  delete process.env.TURNSTILE_SECRET_KEY;
});

test("verificarTurnstile: sem TURNSTILE_SECRET_KEY configurada, recurso desligado (aceita)", async () => {
  delete process.env.TURNSTILE_SECRET_KEY;
  const resultado = await verificarTurnstile(null);
  assert.equal(resultado, true);
});

test("verificarTurnstile: token válido conforme a API do Cloudflare, aceita", async () => {
  process.env.TURNSTILE_SECRET_KEY = "secret-de-teste";
  const originalFetch = global.fetch;
  global.fetch = (async () => new Response(JSON.stringify({ success: true }), { status: 200 })) as typeof fetch;
  try {
    const resultado = await verificarTurnstile("token-valido");
    assert.equal(resultado, true);
  } finally {
    global.fetch = originalFetch;
    delete process.env.TURNSTILE_SECRET_KEY;
  }
});

test("verificarTurnstile: token inválido conforme a API do Cloudflare, rejeita", async () => {
  process.env.TURNSTILE_SECRET_KEY = "secret-de-teste";
  const originalFetch = global.fetch;
  global.fetch = (async () =>
    new Response(JSON.stringify({ success: false, "error-codes": ["invalid-input-response"] }), {
      status: 200,
    })) as typeof fetch;
  try {
    const resultado = await verificarTurnstile("token-invalido");
    assert.equal(resultado, false);
  } finally {
    global.fetch = originalFetch;
    delete process.env.TURNSTILE_SECRET_KEY;
  }
});

test("verificarTurnstile: falha de rede não lança, apenas rejeita", async () => {
  process.env.TURNSTILE_SECRET_KEY = "secret-de-teste";
  const originalFetch = global.fetch;
  global.fetch = (async () => {
    throw new Error("timeout");
  }) as typeof fetch;
  try {
    const resultado = await verificarTurnstile("token-qualquer");
    assert.equal(resultado, false);
  } finally {
    global.fetch = originalFetch;
    delete process.env.TURNSTILE_SECRET_KEY;
  }
});
