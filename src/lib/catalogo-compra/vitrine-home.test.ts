// primeiraImagemPorProduto era duplicada inline 4x em src/app/page.tsx (produtos
// recentes, desconto, mercado futuro, supermercado) e de novo em src/lib/galerias.ts
// — extraída para o módulo de cache da home porque os 4 usos agora passam pela
// mesma função ao montar VitrineHomeBase.

import assert from "node:assert/strict";
import { test } from "vitest";
import { primeiraImagemPorProduto } from "./vitrine-home";

test("primeiraImagemPorProduto", () => {
  // Sem imagens: mapa vazio, não lança.
  assert.deepEqual(primeiraImagemPorProduto(null), new Map());
  assert.deepEqual(primeiraImagemPorProduto([]), new Map());

  // Ordem de entrada = ordem de `ordem` (já ordenado pela query) — a
  // primeira ocorrência de cada produto_id vence, o resto é ignorado.
  const mapa = primeiraImagemPorProduto([
    { produto_id: "p1", url: "capa-p1.jpg" },
    { produto_id: "p1", url: "segunda-p1.jpg" },
    { produto_id: "p2", url: "capa-p2.jpg" },
  ]);
  assert.equal(mapa.get("p1"), "capa-p1.jpg");
  assert.equal(mapa.get("p2"), "capa-p2.jpg");
  assert.equal(mapa.get("p3"), undefined);
  assert.equal(mapa.size, 2);

  console.log("primeiraImagemPorProduto: ok");
});
