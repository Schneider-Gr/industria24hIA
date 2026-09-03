import assert from "node:assert/strict";
import { test } from "vitest";
import { exigeSessao, ehOnboarding, afiliadoOuParceiro, exigeCspEstrita } from "./gate-rotas";

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

test("afiliadoOuParceiro: só /afiliado/logistica (e subpaths)", () => {
  assert.equal(afiliadoOuParceiro("/afiliado/logistica"), true);
  assert.equal(afiliadoOuParceiro("/afiliado/logistica/rota/123"), true);
  assert.equal(afiliadoOuParceiro("/afiliado"), false);
  assert.equal(afiliadoOuParceiro("/afiliado/vitrines"), false);
});

test("exigeSessao: prefixo não casa parcialmente com outra rota", () => {
  // /afiliados (plural, admin) não deve ser tratado como /afiliado
  assert.equal(exigeSessao("/afiliadoss"), false);
});

test("exigeCspEstrita: painéis dinâmicos recebem CSP estrita", () => {
  for (const p of ["/admin", "/seller", "/afiliado", "/parceiro", "/seller/pedidos", "/admin/lojas/123"]) {
    assert.equal(exigeCspEstrita(p), true, p);
  }
});

test("exigeCspEstrita: onboarding fica de fora (/seller/cadastro é prerenderizado — CSP com nonce bloquearia os <script>)", () => {
  for (const p of ["/seller/cadastro", "/parceiro/cadastro", "/afiliado/solicitar"]) {
    assert.equal(exigeCspEstrita(p), false, p);
  }
});

test("exigeCspEstrita: rotas públicas e pré-login ficam de fora (mantêm Static/ISR)", () => {
  for (const p of ["/", "/produto/abc", "/loja/xyz", "/categoria", "/login", "/definir-senha", "/checkout", "/carrinho", "/afiliadoss"]) {
    assert.equal(exigeCspEstrita(p), false, p);
  }
});
