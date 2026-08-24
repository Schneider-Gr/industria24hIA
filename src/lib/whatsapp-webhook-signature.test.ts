import assert from "node:assert/strict";
import crypto from "node:crypto";
import { test } from "vitest";
import { assinaturaWhatsappValida } from "./whatsapp-webhook-signature";

test("whatsapp-webhook-signature", () => {
  const SECRET = "app-secret-de-teste";
  const body = JSON.stringify({ entry: [{ changes: [{ value: { messages: [{ from: "5511999999999" }] } }] }] });
  const assinaturaCorreta =
    "sha256=" + crypto.createHmac("sha256", SECRET).update(body).digest("hex");

  assert.equal(assinaturaWhatsappValida(body, assinaturaCorreta, SECRET), true);

  // Body alterado depois de assinado (payload forjado): assinatura não bate.
  assert.equal(assinaturaWhatsappValida(body + "x", assinaturaCorreta, SECRET), false);

  // Sem header nenhum.
  assert.equal(assinaturaWhatsappValida(body, null, SECRET), false);

  // Header sem o prefixo "sha256=".
  assert.equal(assinaturaWhatsappValida(body, "abc123", SECRET), false);

  // Secret errado (app secret rotacionado/divergente).
  assert.equal(assinaturaWhatsappValida(body, assinaturaCorreta, "outro-secret"), false);

  // Sem App Secret configurado: fail-closed, rejeita mesmo com header presente.
  assert.equal(assinaturaWhatsappValida(body, assinaturaCorreta, ""), false);

  console.log("whatsapp-webhook-signature: ok");
});
