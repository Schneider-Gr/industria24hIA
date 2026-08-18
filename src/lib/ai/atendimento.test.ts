import { test } from "vitest";
import assert from "node:assert/strict";
import { resolverContatoLead } from "./atendimento";

test("resolverContatoLead usa o contato do modelo quando presente", () => {
  assert.equal(resolverContatoLead("cliente@example.com", "55929999999"), "cliente@example.com");
});

test("resolverContatoLead cai no fallback quando o modelo não manda contato", () => {
  assert.equal(resolverContatoLead(undefined, "55929999999"), "55929999999");
});

test("resolverContatoLead cai no fallback quando o modelo manda string vazia", () => {
  assert.equal(resolverContatoLead("", "55929999999"), "55929999999");
});

test("resolverContatoLead cai no fallback quando o modelo manda só espaços", () => {
  assert.equal(resolverContatoLead("   ", "cliente@example.com"), "cliente@example.com");
});

test("resolverContatoLead retorna string vazia sem contato nem fallback", () => {
  assert.equal(resolverContatoLead(undefined, undefined), "");
});
