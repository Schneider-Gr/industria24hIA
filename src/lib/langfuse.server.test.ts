import { test } from "vitest";
import assert from "node:assert/strict";

// Sem LANGFUSE_PUBLIC_KEY/SECRET_KEY o módulo tem que ser no-op silencioso:
// é o estado em dev, em preview e em produção enquanto as chaves não forem
// setadas. Se isso regredir, curadoria de produto/loja passa a quebrar.
test("langfuse: no-op sem credenciais, nunca lança nem rejeita", async () => {
  delete process.env.LANGFUSE_PUBLIC_KEY;
  delete process.env.LANGFUSE_SECRET_KEY;
  const { traceEvent, traceGeneration } = await import("./langfuse.server");

  assert.equal(await traceEvent("teste", { a: 1 }), undefined);
  assert.equal(
    await traceGeneration({
      name: "teste",
      model: "x",
      input: "i",
      output: "o",
      startTime: new Date().toISOString(),
      endTime: new Date().toISOString(),
    }),
    null,
  );
});
