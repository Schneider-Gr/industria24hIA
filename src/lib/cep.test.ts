// enderecoParaRota: CEP puro vira endereço por extenso (o Google não acha rota
// até "69435-000, Brasil", mas acha até "Manaquiri - AM"; 28/09). Fetch mockado.
import assert from "node:assert/strict";
import { test } from "vitest";
import { enderecoParaRota } from "./cep";

const origFetch = globalThis.fetch;
const stub = (resposta: unknown, ok = true) => {
  globalThis.fetch = (async () => ({ ok, json: async () => resposta })) as unknown as typeof fetch;
};

test("enderecoParaRota", async () => {
  // CEP geral de cidade: só cidade - UF.
  stub({ cep: "69435-000", logradouro: "", bairro: "", localidade: "Manaquiri", uf: "AM" });
  assert.equal(await enderecoParaRota("69435-000"), "Manaquiri - AM");

  // CEP de rua: rua, bairro, cidade - UF.
  stub({ cep: "69005-010", logradouro: "Rua Marcílio Dias", bairro: "Centro", localidade: "Manaus", uf: "AM" });
  assert.equal(await enderecoParaRota("69005010"), "Rua Marcílio Dias, Centro, Manaus - AM");

  // ViaCEP falhou ou CEP inexistente: cai no formato antigo.
  stub({ erro: true });
  assert.equal(await enderecoParaRota("69999-999"), "69999-999, Brasil");
  globalThis.fetch = (async () => {
    throw new Error("rede caiu");
  }) as typeof fetch;
  assert.equal(await enderecoParaRota("69999-999"), "69999-999, Brasil");

  // Texto passa como veio; vazio = null.
  assert.equal(await enderecoParaRota("Manaquiri - AM"), "Manaquiri - AM");
  assert.equal(await enderecoParaRota("  "), null);

  globalThis.fetch = origFetch;
});
