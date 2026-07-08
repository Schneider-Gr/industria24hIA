// Self-check da resolução de loja do import (bug hunt 07/07, HIGH 8).
// Reproduz as linhas 262-277 de import-bubble.mjs e garante que uma loja SEM
// dono não vira a chave "undefined" que capturava pedidos sem vendedor.
// Roda com: node scripts/verify-loja-mapping.mjs
import assert from "node:assert/strict";

function resolveLojas({ lojasRaw, lojaMap, itensRaw, pedidosRaw }) {
  const lojaByBubbleUser = {};
  // COM a guarda l._Dono_Proprietario (o fix):
  for (const l of lojasRaw)
    if (l._Dono_Proprietario && lojaMap[l._id]) lojaByBubbleUser[l._Dono_Proprietario] = lojaMap[l._id];
  const itemById = Object.fromEntries(itensRaw.map((i) => [i._id, i]));
  return pedidosRaw.map((pe) => {
    const vend = (pe.vendedores ?? [])[0];
    let loja = lojaMap[vend] ?? lojaByBubbleUser[vend];
    if (!loja) {
      const it = (pe.itens ?? []).map((id) => itemById[id]).find((i) => i?.Loja && lojaMap[i.Loja]);
      loja = it ? lojaMap[it.Loja] : null;
    }
    return loja;
  });
}

// Fixture: loja órfã (sem _Dono_Proprietario) + loja normal.
const lojasRaw = [
  { _id: "orfa", /* sem _Dono_Proprietario */ },
  { _id: "normal", _Dono_Proprietario: "userA" },
];
const lojaMap = { orfa: "uuid-orfa", normal: "uuid-normal" };
const itensRaw = [{ _id: "item1", Loja: "normal" }];

// 1) Pedido sem vendedor e sem item resolvível → NÃO pode virar a loja órfã.
// 2) Pedido do userA → uuid-normal. 3) Pedido cujo item aponta loja → fallback.
const [semLoja, doUserA, viaItem] = resolveLojas({
  lojasRaw,
  lojaMap,
  itensRaw,
  pedidosRaw: [
    { vendedores: [], itens: [] },
    { vendedores: ["userA"], itens: [] },
    { vendedores: [], itens: ["item1"] },
  ],
});

assert.equal(semLoja, null, "pedido sem vendedor não pode herdar a loja sem dono");
assert.equal(doUserA, "uuid-normal", "pedido do dono resolve pela loja dele");
assert.equal(viaItem, "uuid-normal", "fallback pelo item ainda funciona");
console.log("OK: resolução de loja do import está correta");
