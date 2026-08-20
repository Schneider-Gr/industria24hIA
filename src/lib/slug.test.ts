import { test } from "vitest";
import assert from "node:assert/strict";
import { slugify, permalinkProduto, extrairIdDoParam } from "./slug";

test("slugify remove acentos e caracteres especiais", () => {
  assert.equal(slugify("Broa de Milho Tradicional"), "broa-de-milho-tradicional");
  assert.equal(slugify("Aço & Sinalização (25kg)"), "aco-sinalizacao-25kg");
});

test("slugify trunca nomes muito longos sem deixar hifen sobrando", () => {
  const nomeLongo = "produto ".repeat(20).trim();
  const slug = slugify(nomeLongo);
  assert.ok(slug.length <= 80);
  assert.ok(!slug.endsWith("-"));
});

test("slugify de nome vazio devolve string vazia", () => {
  assert.equal(slugify(""), "");
  assert.equal(slugify("   "), "");
});

test("permalinkProduto cai para so o id quando nao ha slug", () => {
  const id = "11111111-1111-1111-1111-111111111111";
  assert.equal(permalinkProduto(id, ""), `/produto/${id}`);
});

test("permalinkProduto anexa o slug decorativo", () => {
  const id = "11111111-1111-1111-1111-111111111111";
  assert.equal(permalinkProduto(id, "Tijolo 3 Furos"), `/produto/${id}-tijolo-3-furos`);
});

test("extrairIdDoParam pega so os 36 primeiros chars", () => {
  const id = "11111111-1111-1111-1111-111111111111";
  assert.equal(extrairIdDoParam(id), id);
  assert.equal(extrairIdDoParam(`${id}-tijolo-3-furos`), id);
});
