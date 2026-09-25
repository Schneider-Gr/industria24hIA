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
