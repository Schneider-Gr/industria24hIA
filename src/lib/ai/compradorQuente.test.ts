import { afterEach, test, vi } from "vitest";
import assert from "node:assert/strict";

const enviar = vi.fn(async () => ({ ok: true as const }));
vi.mock("@/lib/bubblewhats", () => ({ enviarBubblewhats: enviar }));
const score = vi.fn();
vi.mock("./leadScoring", () => ({ scoreJev: score }));

const { avisarLojaSeCompradorQuente, mensagemCompradorQuenteLoja } = await import("./compradorQuente");

afterEach(() => vi.clearAllMocks());

// svc falso: alertas_enviados em memória, loja com WhatsApp.
function svcFalso(jaAvisou = false) {
  const upserts: unknown[] = [];
  const svc = {
    from: (t: string) => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: t === "lojas" ? { whatsapp: "(92) 99999-0000" } : jaAvisou ? { chave: "x" } : null }),
        }),
      }),
      upsert: async (row: unknown) => void upserts.push(row),
    }),
  };
  return { svc: svc as never, upserts };
}

const CONVERSA = { id: "c1", loja_id: "l1", comprador_nome: "Ana" };
const HIST = [{ autor: "comprador" as const, corpo: "preciso de 500 unidades até sexta" }];

test("comprador quente: avisa a loja uma vez e marca a conversa", async () => {
  score.mockResolvedValue("quente");
  const { svc, upserts } = svcFalso();
  await avisarLojaSeCompradorQuente(svc, CONVERSA, HIST, "Parafuso M8");
  assert.equal(enviar.mock.calls.length, 1);
  assert.match((enviar.mock.calls[0] as unknown as [string, string])[1], /Ana está pronto para comprar sobre Parafuso M8/);
  assert.equal((upserts[0] as { chave: string }).chave, "comprador-quente:c1");
});

test("conversa já avisada não chama o Jev nem o WhatsApp", async () => {
  const { svc } = svcFalso(true);
  await avisarLojaSeCompradorQuente(svc, CONVERSA, HIST);
  assert.equal(score.mock.calls.length, 0);
  assert.equal(enviar.mock.calls.length, 0);
});

test("morno, frio ou sem decisão do Jev: nada é enviado", async () => {
  for (const s of ["morno", "frio", null]) {
    score.mockResolvedValue(s);
    await avisarLojaSeCompradorQuente(svcFalso().svc, CONVERSA, HIST);
  }
  assert.equal(enviar.mock.calls.length, 0);
});

test("mensagem sem nome nem produto continua legível", () => {
  assert.match(mensagemCompradorQuenteLoja({ link: "L" }), /^🔥 Indústria 24h: Um comprador está pronto para comprar\./);
});
