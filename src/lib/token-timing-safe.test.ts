import assert from "node:assert/strict";
import { test } from "vitest";
import { tokenValido } from "./token-timing-safe";

test("token-timing-safe", () => {
  assert.equal(tokenValido("token-correto", "token-correto"), true);
  assert.equal(tokenValido("token-errado", "token-correto"), false);
  assert.equal(tokenValido("token-mais-curto", "token-correto-bem-mais-longo"), false);
  assert.equal(tokenValido(null, "token-correto"), false);
  assert.equal(tokenValido("qualquer", ""), false);
});
