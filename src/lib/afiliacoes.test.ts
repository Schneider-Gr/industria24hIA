// Check das partes puras de src/lib/afiliacoes.ts: shape da linha e comissão
// padrão (antes hardcoded em dois inserts diferentes).

import assert from "node:assert/strict";
import {
  PORCENTAGEM_AFILIADO_PADRAO,
  isStatusModeracao,
  montarLinhaAfiliacao,
} from "./afiliacoes";
import { test } from "vitest";

test("afiliacoes", () => {
  const base = {
    afiliadoId: "af-1",
    lojaId: "loja-1",
    tipo: "vendas" as const,
    identificador: "ABC123",
    termosVersao: "v2",
    agora: "2026-09-08T12:00:00.000Z",
  };

  // Sem porcentagem do produto, cai no padrão — em um lugar só.
  const semPct = montarLinhaAfiliacao(base);
  assert.equal(semPct.porcentagem, PORCENTAGEM_AFILIADO_PADRAO);
  assert.equal(semPct.status, "Pendente");
  assert.equal(semPct.termos_aceitos_em, "2026-09-08T12:00:00.000Z");
  // Afiliação de loja não carrega produto_id.
  assert.equal("produto_id" in semPct, false);

  // Porcentagem do produto vence o padrão; zero é valor legítimo, não ausência.
  assert.equal(montarLinhaAfiliacao({ ...base, porcentagem: 12 }).porcentagem, 12);
  assert.equal(montarLinhaAfiliacao({ ...base, porcentagem: 0 }).porcentagem, 0);
  assert.equal(montarLinhaAfiliacao({ ...base, porcentagem: null }).porcentagem, PORCENTAGEM_AFILIADO_PADRAO);

  // Afiliação por produto carrega produto_id e loja derivada do produto.
  const porProduto = montarLinhaAfiliacao({ ...base, produtoId: "prod-9" });
  assert.equal(porProduto.produto_id, "prod-9");

  assert.equal(isStatusModeracao("Aprovada"), true);
  assert.equal(isStatusModeracao("Suspensa"), true);
  assert.equal(isStatusModeracao("Pendente"), false);
  assert.equal(isStatusModeracao("ativo"), false);
});
