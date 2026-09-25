import assert from "node:assert/strict";
import { test } from "vitest";
import { validarConfigAfiliado } from "./config-afiliado";

const base = {
  nome: "Ana",
  cep: "69035-420",
  cidade: "Manaus",
  bairro: "Compensa",
  numero: "12",
  telefone: "(68) 99945-0383",
  veiculo: "Moto",
  peso: "30",
  minimo: "8,50",
};

test("configurações do afiliado logístico (paridade Bubble)", () => {
  // normaliza CEP, telefone e decimais com vírgula
  assert.deepEqual(validarConfigAfiliado(base), {
    ok: true,
    campos: {
      nome: "Ana",
      cep_base: "69035420",
      cidade: "Manaus",
      bairro: "Compensa",
      numero: "12",
      telefone: "68999450383",
      veiculo: "Moto",
      capacidade_kg: 30,
      valor_minimo_entrega: 8.5,
    },
  });
  // opcionais vazios viram null
  const vazio = validarConfigAfiliado({ ...base, numero: "", veiculo: " ", peso: "", minimo: "" });
  assert.equal(vazio.ok && vazio.campos.numero, null);
  assert.equal(vazio.ok && vazio.campos.capacidade_kg, null);
  // obrigatórios e faixas
  assert.equal(validarConfigAfiliado({ ...base, nome: " " }).ok, false);
  assert.equal(validarConfigAfiliado({ ...base, cep: "6903" }).ok, false);
  assert.equal(validarConfigAfiliado({ ...base, telefone: "123" }).ok, false);
  assert.equal(validarConfigAfiliado({ ...base, peso: "-1" }).ok, false);
  assert.equal(validarConfigAfiliado({ ...base, minimo: "abc" }).ok, false);
});
