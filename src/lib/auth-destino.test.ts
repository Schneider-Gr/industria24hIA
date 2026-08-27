import assert from "node:assert/strict";
import { test } from "vitest";
import { destinoPorPapel } from "./auth-destino";

test("destinoPorPapel: precedência de painel por papel", () => {
  const nenhum = { admin: false, temLoja: false, temAfiliacao: false, temParceiro: false };

  // Sem papel nenhum: comprador vai pra home.
  assert.equal(destinoPorPapel(nenhum), "/");

  // Admin ganha de todo o resto.
  assert.equal(
    destinoPorPapel({ admin: true, temLoja: true, temAfiliacao: true, temParceiro: true }),
    "/admin",
  );

  // Loja > afiliação > parceiro.
  assert.equal(destinoPorPapel({ ...nenhum, temLoja: true }), "/seller");
  assert.equal(destinoPorPapel({ ...nenhum, temLoja: true, temAfiliacao: true }), "/seller");
  assert.equal(destinoPorPapel({ ...nenhum, temAfiliacao: true }), "/afiliado");
  assert.equal(destinoPorPapel({ ...nenhum, temAfiliacao: true, temParceiro: true }), "/afiliado");
  assert.equal(destinoPorPapel({ ...nenhum, temParceiro: true }), "/parceiro");
});
