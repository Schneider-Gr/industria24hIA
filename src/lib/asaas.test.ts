import assert from "node:assert/strict";
import { afterEach, test, vi } from "vitest";
import { createPayment } from "./asaas";

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
