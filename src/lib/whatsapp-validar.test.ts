import assert from "node:assert/strict";
import { test } from "vitest";
import { validarWhatsapp } from "./whatsapp";

test("WhatsApp obrigatório: só dígitos, DDD + número", () => {
  assert.equal(validarWhatsapp("(92) 99123-4567"), "92991234567");
  assert.equal(validarWhatsapp("92 3212-3456"), "9232123456");
  assert.equal(validarWhatsapp("+55 92 99123-4567"), "92991234567");
  assert.equal(validarWhatsapp(""), null);
  assert.equal(validarWhatsapp("123"), null);
  assert.equal(validarWhatsapp("929912345678901"), null);
});

test("normalizeWhatsapp decide pelo tamanho: DDD 55 (RS) não perde o DDI", async () => {
  const { normalizeWhatsapp } = await import("./whatsapp");
  assert.equal(normalizeWhatsapp("55991234567"), "5555991234567"); // DDD 55, sem DDI
  assert.equal(normalizeWhatsapp("92991234567"), "5592991234567");
  assert.equal(normalizeWhatsapp("5592991234567"), "5592991234567"); // já com DDI
  assert.equal(normalizeWhatsapp("+55 55 99123-4567"), "5555991234567");
  assert.equal(normalizeWhatsapp(""), "");
});
