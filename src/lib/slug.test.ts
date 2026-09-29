import { test } from "vitest";
import assert from "node:assert/strict";
import { slugify, permalinkProduto, extrairIdDoParam, ehParamComUuid } from "./slug";

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

test("permalinkProduto usa so o slug persistido", () => {
  assert.equal(permalinkProduto("broa-de-milho"), "/produto/broa-de-milho");
});

test("ehParamComUuid separa URL antiga (uuid) de slug", () => {
  const id = "1ef6f6db-7d3a-4a2e-a67d-e8efec3250a5";
  assert.equal(ehParamComUuid(id), true);
  assert.equal(ehParamComUuid(`${id}-broa-de-milho`), true);
  assert.equal(ehParamComUuid("broa-de-milho"), false);
  assert.equal(ehParamComUuid("tijolo-6-furo-comum-milheiro-2"), false);
});

test("extrairIdDoParam pega so os 36 primeiros chars", () => {
  const id = "11111111-1111-1111-1111-111111111111";
  assert.equal(extrairIdDoParam(id), id);
  assert.equal(extrairIdDoParam(`${id}-tijolo-3-furos`), id);
});
