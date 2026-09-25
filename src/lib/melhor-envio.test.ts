import assert from "node:assert/strict";
import { test } from "vitest";
import { menorPrecoMelhorEnvio } from "./melhor-envio";

test("Melhor Envio: menor preço entre os serviços sem erro (price vem como string)", () => {
  const resp = [
    { id: 1, name: "PAC", price: "42.10", company: { name: "Correios" } },
    { id: 2, name: "SEDEX", price: "80.00", company: { name: "Correios" } },
    { id: 3, name: ".Package", error: "Serviço indisponível no momento", company: { name: "Jadlog" } },
  ];
  assert.deepEqual(menorPrecoMelhorEnvio(resp), { valor: 42.1, servico: "Correios PAC" });
  assert.equal(menorPrecoMelhorEnvio([{ id: 1, name: "PAC", error: "x" }]), null);
  assert.equal(menorPrecoMelhorEnvio({ message: "Unauthenticated." }), null);
});
