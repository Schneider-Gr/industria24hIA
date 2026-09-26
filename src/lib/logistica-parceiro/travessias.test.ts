import assert from "node:assert/strict";
import { test } from "vitest";
import { travessiaDoForm } from "./travessias";

const fd = (o: Record<string, string>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(o)) f.set(k, v);
  return f;
};

test("travessiaDoForm: valida valor e fatores; vazio vira null", () => {
  const ok = travessiaDoForm(fd({ nome: " Balsa X ", valor_equivalente: "30,67", fator_moto: "", fator_carro: "1.5", fator_caminhao: "3", fatores_oficiais: "on", ativo: "on", vigente_desde: "2026-08-28" }));
  assert.deepEqual(ok.erros, []);
  assert.equal(ok.dados?.nome, "Balsa X");
  assert.equal(ok.dados?.valor_equivalente, 30.67);
  assert.equal(ok.dados?.fator_moto, null);
  assert.equal(ok.dados?.fatores_oficiais, true);
  const ruim = travessiaDoForm(fd({ nome: "", valor_equivalente: "0", fator_carro: "-1" }));
  assert.deepEqual(ruim.erros, ["Informe o nome.", "Valor por veículo equivalente deve ser maior que zero.", "Fator do carro deve ser maior que zero."]);
});
