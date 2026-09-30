import assert from "node:assert/strict";
import crypto from "node:crypto";
import { test } from "vitest";
import { assinaturaUberDirectValida } from "./uber-direct-webhook-signature";

test("uber-direct-webhook-signature", () => {
  const SIGNING_KEY = "signing-key-de-teste";
  const body = JSON.stringify({ kind: "event.delivery_status", data: { delivery_id: "abc", status: "delivered" } });
  const assinaturaCorreta = crypto.createHmac("sha256", SIGNING_KEY).update(body).digest("hex");

  assert.equal(assinaturaUberDirectValida(body, assinaturaCorreta, SIGNING_KEY), true);

  // Body alterado depois de assinado (payload forjado): assinatura não bate.
  assert.equal(assinaturaUberDirectValida(body + "x", assinaturaCorreta, SIGNING_KEY), false);

  // Sem header nenhum.
  assert.equal(assinaturaUberDirectValida(body, null, SIGNING_KEY), false);

  // Signing key errada (rotacionada/divergente).
  assert.equal(assinaturaUberDirectValida(body, assinaturaCorreta, "outra-key"), false);

  // Sem signing key configurada: fail-closed, rejeita mesmo com header presente
  // (achado OWASP #2 — antes desta correção isso retornava true).
  assert.equal(assinaturaUberDirectValida(body, assinaturaCorreta, ""), false);
});
