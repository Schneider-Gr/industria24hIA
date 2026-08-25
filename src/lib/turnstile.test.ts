import assert from "node:assert/strict";
import { test, vi, beforeEach } from "vitest";

const captureMessage = vi.fn();
vi.mock("@sentry/nextjs", () => ({ captureMessage: (...args: unknown[]) => captureMessage(...args) }));

const { verificarTurnstile, validarTurnstile } = await import("./turnstile");

beforeEach(() => {
  captureMessage.mockClear();
});

test("verificarTurnstile: sem token, com secret configurada, rejeita e loga motivo sem_token", async () => {
  process.env.TURNSTILE_SECRET_KEY = "secret-de-teste";
  const resultado = await verificarTurnstile(null, undefined, "checkout");
  assert.equal(resultado, false);
  assert.equal(captureMessage.mock.calls[0][1]?.tags?.motivo, "sem_token");
  assert.equal(captureMessage.mock.calls[0][1]?.tags?.contexto, "checkout");
  delete process.env.TURNSTILE_SECRET_KEY;
});

test("validarTurnstile: sem token, com secret configurada, rejeita e loga contexto cadastro", async () => {
  process.env.TURNSTILE_SECRET_KEY = "secret-de-teste";
  const resultado = await validarTurnstile(null, "cadastro");
  assert.equal(resultado, false);
  assert.equal(captureMessage.mock.calls[0][1]?.tags?.motivo, "sem_token");
  assert.equal(captureMessage.mock.calls[0][1]?.tags?.contexto, "cadastro");
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

test("verificarTurnstile: token inválido conforme a API do Cloudflare, rejeita e loga motivo rejeitado_cloudflare", async () => {
  process.env.TURNSTILE_SECRET_KEY = "secret-de-teste";
  const originalFetch = global.fetch;
  global.fetch = (async () =>
    new Response(JSON.stringify({ success: false, "error-codes": ["invalid-input-response"] }), {
      status: 200,
    })) as typeof fetch;
  try {
    const resultado = await verificarTurnstile("token-invalido");
    assert.equal(resultado, false);
    assert.equal(captureMessage.mock.calls[0][1]?.tags?.motivo, "rejeitado_cloudflare");
    assert.deepEqual(captureMessage.mock.calls[0][1]?.extra?.errorCodes, ["invalid-input-response"]);
  } finally {
    global.fetch = originalFetch;
    delete process.env.TURNSTILE_SECRET_KEY;
  }
});

test("verificarTurnstile: falha de rede não lança, apenas rejeita e loga motivo falha_rede", async () => {
  process.env.TURNSTILE_SECRET_KEY = "secret-de-teste";
  const originalFetch = global.fetch;
  global.fetch = (async () => {
    throw new Error("timeout");
  }) as typeof fetch;
  try {
    const resultado = await verificarTurnstile("token-qualquer");
    assert.equal(resultado, false);
    assert.equal(captureMessage.mock.calls[0][1]?.tags?.motivo, "falha_rede");
  } finally {
    global.fetch = originalFetch;
    delete process.env.TURNSTILE_SECRET_KEY;
  }
});
