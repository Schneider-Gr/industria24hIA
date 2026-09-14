import assert from "node:assert/strict";
import { test } from "vitest";
import { AJUDA_POR_ROTA } from "./ajuda-telas";
import { DICAS } from "./dicas";
import { MANUAL_SELLER } from "@/components/seller/manual-seller";

// O botão de ajuda promete duas coisas que vivem em outro arquivo: um tópico
// do manual e um bloco de dicas. Renomear um slug do manual ou uma tela do
// `dicas.ts` quebraria o link em silêncio — quebra aqui em vez disso.

test("todo tópico apontado pelo botão de ajuda existe no manual", () => {
  const slugs = new Set(MANUAL_SELLER.map((t) => t.id));
  const orfaos = Object.entries(AJUDA_POR_ROTA)
    .filter(([, ajuda]) => !slugs.has(ajuda.topico))
    .map(([rota, ajuda]) => `${rota} → #${ajuda.topico}`);

  assert.deepEqual(orfaos, [], `tópicos inexistentes: ${orfaos.join(", ")}`);
});

test("toda tela de dicas apontada pelo botão existe em DICAS", () => {
  const orfaos = Object.entries(AJUDA_POR_ROTA)
    .filter(([, ajuda]) => ajuda.dicas && !DICAS[ajuda.dicas])
    .map(([rota, ajuda]) => `${rota} → ${ajuda.dicas}`);

  assert.deepEqual(orfaos, [], `telas de dicas inexistentes: ${orfaos.join(", ")}`);
});
