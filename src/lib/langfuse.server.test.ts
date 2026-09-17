import { test, vi } from "vitest";
import assert from "node:assert/strict";

// Sem LANGFUSE_PUBLIC_KEY/SECRET_KEY o módulo tem que ser no-op de verdade —
// nem sequer tocar a rede. É o estado em dev, no CI e em produção enquanto as
// chaves não forem setadas. O fetch é stubado porque um teste que depende de
// rede passa verde por acidente quando o runner está offline: a chamada
// rejeita, cai no catch do helper e devolve o mesmo null do caminho no-op.
test("langfuse: sem credencial não chama a rede e não lança", async () => {
  const envAntes = {
    pk: process.env.LANGFUSE_PUBLIC_KEY,
    sk: process.env.LANGFUSE_SECRET_KEY,
  };
  const fetchAntes = globalThis.fetch;
  const fetchFalso = vi.fn(async () => new Response("{}", { status: 200 }));
  globalThis.fetch = fetchFalso as unknown as typeof fetch;

  try {
    delete process.env.LANGFUSE_PUBLIC_KEY;
    delete process.env.LANGFUSE_SECRET_KEY;
    vi.resetModules();
    const { traceEvent, traceGeneration } = await import("./langfuse.server");

    await traceEvent("teste", { a: 1 });
    const traceId = await traceGeneration({
      name: "teste",
      model: "x",
      input: "i",
      output: "o",
      startTime: new Date().toISOString(),
      endTime: new Date().toISOString(),
    });

    assert.equal(traceId, null, "sem chave, traceGeneration devolve null");
    assert.equal(fetchFalso.mock.calls.length, 0, "sem chave, nada vai para a rede");
  } finally {
    globalThis.fetch = fetchAntes;
    if (envAntes.pk === undefined) delete process.env.LANGFUSE_PUBLIC_KEY;
    else process.env.LANGFUSE_PUBLIC_KEY = envAntes.pk;
    if (envAntes.sk === undefined) delete process.env.LANGFUSE_SECRET_KEY;
    else process.env.LANGFUSE_SECRET_KEY = envAntes.sk;
    vi.resetModules();
  }
});

// Com credencial, o helper tem que POSTar no endpoint de ingestão com Basic
// auth — e uma falha de rede continua sendo engolida (observabilidade nunca
// derruba curadoria).
test("langfuse: com credencial POSTa com Basic auth e engole falha de rede", async () => {
  const envAntes = {
    pk: process.env.LANGFUSE_PUBLIC_KEY,
    sk: process.env.LANGFUSE_SECRET_KEY,
  };
  const fetchAntes = globalThis.fetch;

  try {
    process.env.LANGFUSE_PUBLIC_KEY = "pk-teste";
    process.env.LANGFUSE_SECRET_KEY = "sk-teste";
    vi.resetModules();

    const chamadas: Array<{ url: string; auth: string; body: string }> = [];
    globalThis.fetch = (async (url: string, init: RequestInit) => {
      const headers = init.headers as Record<string, string>;
      chamadas.push({
        url: String(url),
        auth: headers.Authorization,
        body: String(init.body),
      });
      return new Response("{}", { status: 200 });
    }) as unknown as typeof fetch;

    const { traceEvent } = await import("./langfuse.server");
    await traceEvent("curadoria-produto-sem-gap", { produtoId: "abc" });

    assert.equal(chamadas.length, 1);
    assert.ok(chamadas[0].url.endsWith("/api/public/ingestion"));
    assert.equal(
      chamadas[0].auth,
      `Basic ${Buffer.from("pk-teste:sk-teste").toString("base64")}`,
    );
    assert.ok(chamadas[0].body.includes("curadoria-produto-sem-gap"));

    // rede caindo não pode propagar
    globalThis.fetch = (async () => {
      throw new Error("rede fora");
    }) as unknown as typeof fetch;
    await traceEvent("outro", {});
  } finally {
    globalThis.fetch = fetchAntes;
    if (envAntes.pk === undefined) delete process.env.LANGFUSE_PUBLIC_KEY;
    else process.env.LANGFUSE_PUBLIC_KEY = envAntes.pk;
    if (envAntes.sk === undefined) delete process.env.LANGFUSE_SECRET_KEY;
    else process.env.LANGFUSE_SECRET_KEY = envAntes.sk;
    vi.resetModules();
  }
});
