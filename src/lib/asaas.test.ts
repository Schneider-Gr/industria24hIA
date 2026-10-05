import assert from "node:assert/strict";
import { afterEach, test, vi } from "vitest";
import { createPayment, createPixTransfer, erroAsaasIncerto } from "./asaas";

const opts = {
  customerId: "cus_1",
  billingType: "CREDIT_CARD" as const,
  value: 100,
  pedidoId: "p1",
  descricao: "Pedido X",
  successUrl: "https://industria24.com.br/pedido/p1",
};

afterEach(() => vi.unstubAllGlobals());

test("conta Asaas sem domínio cadastrado: refaz a cobrança sem callback", async () => {
  const corpos: Record<string, unknown>[] = [];
  vi.stubGlobal("fetch", async (_url: string, init: RequestInit) => {
    const corpo = JSON.parse(String(init.body));
    corpos.push(corpo);
    if (corpo.callback) {
      return new Response(
        JSON.stringify({
          errors: [
            {
              code: "invalid_object",
              description:
                "Não há nenhum domínio configurado em sua conta. Cadastre um site em Minha Conta na aba Informações.",
            },
          ],
        }),
        { status: 400 },
      );
    }
    return new Response(JSON.stringify({ id: "pay_1", invoiceUrl: "u", status: "PENDING" }));
  });

  const cobranca = await createPayment(opts);

  assert.equal(cobranca.id, "pay_1");
  assert.equal(corpos.length, 2);
  assert.ok(corpos[0].callback);
  assert.equal(corpos[1].callback, undefined);
});

test("outro erro do Asaas continua subindo, sem segunda tentativa", async () => {
  let chamadas = 0;
  vi.stubGlobal("fetch", async () => {
    chamadas++;
    return new Response(JSON.stringify({ errors: [{ code: "invalid_value", description: "Valor inválido" }] }), {
      status: 400,
    });
  });

  await assert.rejects(createPayment(opts), /Valor inválido/);
  assert.equal(chamadas, 1);
});

const pix = {
  value: 10,
  pixAddressKey: "x@y.com",
  pixAddressKeyType: "EMAIL" as const,
  description: "Repasse",
  externalReference: "r1",
};

test("PIX sem resposta (rede/timeout) é incerto: o Asaas pode ter executado", async () => {
  vi.stubGlobal("fetch", async () => {
    throw new TypeError("fetch failed");
  });
  const erro = await createPixTransfer(pix).catch((e) => e);
  assert.equal(erroAsaasIncerto(erro), true);
});

test("PIX com 5xx é incerto; 4xx é recusa definitiva", async () => {
  vi.stubGlobal("fetch", async () => new Response("{}", { status: 502 }));
  assert.equal(erroAsaasIncerto(await createPixTransfer(pix).catch((e) => e)), true);

  vi.stubGlobal("fetch", async () =>
    new Response(JSON.stringify({ errors: [{ code: "invalid_pix", description: "Chave inválida" }] }), { status: 400 }),
  );
  const recusa = await createPixTransfer(pix).catch((e) => e);
  assert.match(recusa.message, /Chave inválida/);
  assert.equal(erroAsaasIncerto(recusa), false);
});
