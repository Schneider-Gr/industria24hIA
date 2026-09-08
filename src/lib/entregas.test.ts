// Check das partes puras de src/lib/entregas.ts: validação de status e a
// tradução do retorno da RPC pedido_confirmar_entrega (0071/0090).

import assert from "node:assert/strict";
import { interpretarRetornoConfirmacao, isStatusEntrega } from "./entregas";
import { test } from "vitest";

test("entregas", () => {
  assert.equal(isStatusEntrega("Pendente"), true);
  assert.equal(isStatusEntrega("Enviado"), true);
  assert.equal(isStatusEntrega("Entregue"), true);
  assert.equal(isStatusEntrega("entregue"), false);
  assert.equal(isStatusEntrega("Cancelado"), false);

  // -1 é código errado, não falha de banco: a RPC devolve em vez de lançar
  // para não reverter o contador de tentativas.
  assert.deepEqual(interpretarRetornoConfirmacao(-1), { resultado: "codigo_incorreto" });
  // 0 = pedido já estava confirmado; a operação é idempotente, não é erro.
  assert.deepEqual(interpretarRetornoConfirmacao(0), { resultado: "ja_confirmado" });
  // Qualquer positivo = linhas confirmadas agora (libera repasse).
  assert.deepEqual(interpretarRetornoConfirmacao(3), { resultado: "confirmado" });
  assert.deepEqual(interpretarRetornoConfirmacao(null), { resultado: "confirmado" });
});
