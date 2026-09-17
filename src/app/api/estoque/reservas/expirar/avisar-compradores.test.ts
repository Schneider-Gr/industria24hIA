// O que este teste protege: o cron só avisa quem a expiração REALMENTE
// cancelou. Ele lista os candidatos antes de chamar a RPC, e entre a listagem e
// a confirmação o pagamento pode entrar — avisar "seu pedido caiu" para quem
// acabou de pagar é o erro caro desta rotina, e ele não aparece em teste manual
// porque depende de corrida.
import assert from "node:assert/strict";
import { test, vi } from "vitest";

const enviados: { to: string; subject: string }[] = [];
vi.mock("@/lib/email", () => ({
  enviarEmail: async (opts: { to: string; subject: string }) => {
    enviados.push(opts);
    return { enviado: true };
  },
}));
vi.mock("@/lib/supabase/service", () => ({
  isServiceConfigured: true,
  createServiceClient: () => ({}),
}));
vi.mock("@/lib/observabilidade/registrar-evento", () => ({ registrarEvento: async () => {} }));

const { avisarCompradores } = await import("./route");

// Dos três candidatos, só dois terminaram cancelados: o terceiro pagou na
// janela entre a listagem e a expiração.
function clienteFalso() {
  return {
    from: () => ({
      select: () => ({
        in: () => ({
          eq: async () => ({
            data: [
              { id: "p1", id_venda: "IND-0001", cliente_id: "u1" },
              { id: "p2", id_venda: "IND-0002", cliente_id: "u2" },
            ],
          }),
        }),
      }),
    }),
    auth: {
      admin: {
        getUserById: async (id: string) => ({
          data: { user: { email: `${id}@exemplo.com` } },
        }),
      },
    },
  };
}

test("avisa só os pedidos que a expiração cancelou", async () => {
  enviados.length = 0;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- cliente falso, só os métodos usados
  const r = await avisarCompradores(clienteFalso() as any, ["p1", "p2", "p3"]);

  assert.equal(r.avisados, 2);
  assert.equal(r.erros.length, 0);
  assert.deepEqual(
    enviados.map((e) => e.to).sort(),
    ["u1@exemplo.com", "u2@exemplo.com"],
  );
  // p3 pagou na janela: nenhum e-mail para ele.
  assert.ok(!enviados.some((e) => e.subject.includes("IND-0003")));
  // O motivo tem de ser prazo vencido, não o texto genérico de cancelamento.
  assert.ok(enviados.every((e) => e.subject.includes("falta de pagamento")));
});

test("sem candidatos não consulta nada nem envia", async () => {
  enviados.length = 0;
  const explode = {
    from: () => {
      throw new Error("não deveria consultar o banco sem candidatos");
    },
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- idem
  const r = await avisarCompradores(explode as any, []);
  assert.deepEqual(r, { avisados: 0, erros: [] });
  assert.equal(enviados.length, 0);
});
