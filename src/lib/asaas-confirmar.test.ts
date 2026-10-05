import assert from "node:assert/strict";
import { beforeEach, test, vi } from "vitest";

const estado = vi.hoisted(() => ({ status: "Aguardando Pagamento" as string | null, rpcs: 0, emails: [] as string[] }));

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({ maybeSingle: async () => ({ data: estado.status ? { status_pedido: estado.status } : null }) }),
      }),
    }),
    rpc: async () => {
      estado.rpcs++;
      return { error: null };
    },
  }),
}));
vi.mock("@/lib/email", () => ({
  notificarMudancaStatusPedido: async (_svc: unknown, _id: string, status: string) => {
    estado.emails.push(status);
  },
}));

const { cancelarPedidoPorPagamento } = await import("./asaas-confirmar");

beforeEach(() => {
  estado.rpcs = 0;
  estado.emails = [];
});

test("pedido aguardando pagamento: cancela e avisa o comprador", async () => {
  estado.status = "Aguardando Pagamento";
  await cancelarPedidoPorPagamento("p1");
  assert.equal(estado.rpcs, 1);
  assert.deepEqual(estado.emails, ["Cancelado"]);
});

test("REFUNDED de pedido já pago não manda e-mail de cancelamento falso", async () => {
  for (const status of ["Pagamento Realizado", "Enviado", "Cancelado"]) {
    estado.status = status;
    await cancelarPedidoPorPagamento("p1");
  }
  assert.equal(estado.rpcs, 0);
  assert.deepEqual(estado.emails, []);
});
