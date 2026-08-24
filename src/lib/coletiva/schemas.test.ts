import { test } from "vitest";
import assert from "node:assert/strict";
import { criarColetivaSchema, participarColetivaSchema } from "./schemas";

const UUID = "11111111-1111-4111-8111-111111111111";

test("criarColetivaSchema aceita payload sem entrega (retirada)", () => {
  const r = criarColetivaSchema.safeParse({ produto_id: UUID, quantidade: 5, entrega: null });
  assert.equal(r.success, true);
});

test("criarColetivaSchema rejeita quantidade zero", () => {
  const r = criarColetivaSchema.safeParse({ produto_id: UUID, quantidade: 0, entrega: null });
  assert.equal(r.success, false);
});

test("criarColetivaSchema rejeita produto_id que não é uuid", () => {
  const r = criarColetivaSchema.safeParse({ produto_id: "abc", quantidade: 1, entrega: null });
  assert.equal(r.success, false);
});

test("participarColetivaSchema exige coletiva_id válido e quantidade positiva", () => {
  assert.equal(
    participarColetivaSchema.safeParse({ coletiva_id: UUID, quantidade: 1 }).success,
    true,
  );
  assert.equal(
    participarColetivaSchema.safeParse({ coletiva_id: "x", quantidade: 1 }).success,
    false,
  );
});
