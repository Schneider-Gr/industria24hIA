// Contrato central do helper (spec observabilidade-cron-jobs /
// observabilidade-checkout-financeiro): falha ao registrar nunca pode
// lançar exceção para o chamador. Sem SUPABASE_SERVICE_ROLE_KEY no
// ambiente de teste, isServiceConfigured é false — cobre exatamente o
// caminho de "dependência indisponível" sem precisar mockar o Supabase.

import assert from "node:assert/strict";
import { test } from "vitest";
import { registrarEvento } from "./registrar-evento";

test("registrar-evento", async () => {
  await assert.doesNotReject(() =>
    registrarEvento({
      capability: "cron",
      origem: "teste",
      resultado: "falha",
      motivo: "dependência indisponível",
    }),
  );

  await assert.doesNotReject(() =>
    registrarEvento({
      capability: "cron",
      origem: "teste",
      resultado: "sucesso",
    }),
  );
});
