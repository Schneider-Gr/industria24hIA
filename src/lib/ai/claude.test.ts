import { test } from "vitest";
import assert from "node:assert/strict";
import { paraAnthropic } from "./claude";

// O loop de tool-calling do atendimento.ts empurra 1 assistant + N tool
// results seguidos. Na Anthropic os N results têm que caber numa única
// mensagem user — se saírem separados, a API rejeita o turno inteiro.
test("agrupa tool results da mesma rodada em uma única mensagem user", () => {
  const out = paraAnthropic([
    { role: "user", content: "quais meus pedidos?" },
    {
      role: "assistant",
      content: null,
      tool_calls: [
        { id: "t1", type: "function", function: { name: "listar_pedidos", arguments: "{}" } },
        { id: "t2", type: "function", function: { name: "buscar_disputas_pos_venda", arguments: "{}" } },
      ],
    },
    { role: "tool", tool_call_id: "t1", content: '{"pedidos":[]}' },
    { role: "tool", tool_call_id: "t2", content: '{"disputas":[]}' },
  ]);

  assert.equal(out.length, 3);
  assert.equal(out[0].role, "user");
  assert.deepEqual(out[1], {
    role: "assistant",
    content: [
      { type: "tool_use", id: "t1", name: "listar_pedidos", input: {} },
      { type: "tool_use", id: "t2", name: "buscar_disputas_pos_venda", input: {} },
    ],
  });
  assert.deepEqual(out[2], {
    role: "user",
    content: [
      { type: "tool_result", tool_use_id: "t1", content: '{"pedidos":[]}' },
      { type: "tool_result", tool_use_id: "t2", content: '{"disputas":[]}' },
    ],
  });
});

test("descarta assistant inicial: a conversa precisa começar com user", () => {
  const out = paraAnthropic([
    { role: "assistant", content: "Olá! Quem é você?" },
    { role: "user", content: "sou seller" },
  ]);
  assert.equal(out.length, 1);
  assert.equal(out[0].role, "user");
});
