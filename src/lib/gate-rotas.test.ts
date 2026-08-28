import assert from "node:assert/strict";
import { test } from "vitest";
import { exigeSessao, ehOnboarding } from "./gate-rotas";

test("exigeSessao: rotas de painel exigem sessão", () => {
  for (const p of ["/admin", "/seller", "/afiliado", "/parceiro", "/admin/lojas", "/seller/pedidos"]) {
    assert.equal(exigeSessao(p), true, p);
  }
});

test("exigeSessao: onboarding NÃO exige sessão na borda", () => {
  for (const p of ["/seller/cadastro", "/parceiro/cadastro", "/afiliado/solicitar"]) {
    assert.equal(exigeSessao(p), false, p);
    assert.equal(ehOnboarding(p), true, p);
  }
});

test("exigeSessao: rotas públicas ficam livres", () => {
  for (const p of ["/", "/login", "/produto/abc", "/cadastro", "/vender-como-afiliado", "/checkout"]) {
    assert.equal(exigeSessao(p), false, p);
  }
});

test("exigeSessao: prefixo não casa parcialmente com outra rota", () => {
  // /afiliados (plural, admin) não deve ser tratado como /afiliado
  assert.equal(exigeSessao("/afiliadoss"), false);
});
