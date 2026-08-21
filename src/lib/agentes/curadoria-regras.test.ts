import { test } from "vitest";
import assert from "node:assert/strict";
import { avaliarProduto, avaliarLoja } from "./curadoria-regras";

test("avaliarProduto: produto completo não gera gaps", () => {
  const gaps = avaliarProduto(
    { nome: "Parafuso sextavado M8", descricao: "Parafuso sextavado zincado, M8x30mm, caixa com 100 unidades.", categoria_id: "cat-1" },
    2,
  );
  assert.deepEqual(gaps, []);
});

test("avaliarProduto: nome curto gera gap 'nome'", () => {
  const gaps = avaliarProduto({ nome: "Parafuso", descricao: "a".repeat(50), categoria_id: "cat-1" }, 1);
  assert.equal(gaps.length, 1);
  assert.equal(gaps[0].campo, "nome");
});

test("avaliarProduto: zero imagens gera gap 'imagens'", () => {
  const gaps = avaliarProduto({ nome: "Parafuso sextavado M8", descricao: "a".repeat(50), categoria_id: "cat-1" }, 0);
  assert.equal(gaps.length, 1);
  assert.equal(gaps[0].campo, "imagens");
});

test("avaliarProduto: descrição ausente ou curta gera gap 'descricao'", () => {
  const semDescricao = avaliarProduto({ nome: "Parafuso sextavado M8", descricao: null, categoria_id: "cat-1" }, 1);
  assert.equal(semDescricao[0].campo, "descricao");

  const descricaoCurta = avaliarProduto({ nome: "Parafuso sextavado M8", descricao: "curta", categoria_id: "cat-1" }, 1);
  assert.equal(descricaoCurta[0].campo, "descricao");
});

test("avaliarProduto: categoria ausente gera gap 'categoria'", () => {
  const gaps = avaliarProduto({ nome: "Parafuso sextavado M8", descricao: "a".repeat(50), categoria_id: null }, 1);
  assert.equal(gaps.length, 1);
  assert.equal(gaps[0].campo, "categoria");
});

test("avaliarProduto: combina múltiplos gaps", () => {
  const gaps = avaliarProduto({ nome: "x", descricao: null, categoria_id: null }, 0);
  const campos = gaps.map((g) => g.campo).sort();
  assert.deepEqual(campos, ["categoria", "descricao", "imagens", "nome"]);
});

test("avaliarLoja: loja completa não gera gaps", () => {
  const gaps = avaliarLoja({
    cnpj: "11.222.333/0001-81",
    cep: "69000-000",
    cidade: "Manaus",
    estado: "AM",
    rua: "Rua das Indústrias",
    numero: "100",
    whatsapp: "92999999999",
    email: null,
    chave_pix_confirmada_em: "2026-08-01T00:00:00Z",
  });
  assert.deepEqual(gaps, []);
});

test("avaliarLoja: CNPJ ausente gera gap 'cnpj'", () => {
  const gaps = avaliarLoja({
    cnpj: null, cep: "69000-000", cidade: "Manaus", estado: "AM", rua: "Rua X", numero: "100",
    whatsapp: "92999999999", email: null, chave_pix_confirmada_em: "2026-08-01T00:00:00Z",
  });
  assert.equal(gaps.length, 1);
  assert.equal(gaps[0].campo, "cnpj");
});

test("avaliarLoja: endereço incompleto gera um único gap 'endereco'", () => {
  const gaps = avaliarLoja({
    cnpj: "11.222.333/0001-81", cep: null, cidade: "Manaus", estado: null, rua: "Rua X", numero: null,
    whatsapp: "92999999999", email: null, chave_pix_confirmada_em: "2026-08-01T00:00:00Z",
  });
  assert.equal(gaps.length, 1);
  assert.equal(gaps[0].campo, "endereco");
});

test("avaliarLoja: sem whatsapp nem e-mail gera gap 'contato'", () => {
  const gaps = avaliarLoja({
    cnpj: "11.222.333/0001-81", cep: "69000-000", cidade: "Manaus", estado: "AM", rua: "Rua X", numero: "100",
    whatsapp: null, email: null, chave_pix_confirmada_em: "2026-08-01T00:00:00Z",
  });
  assert.equal(gaps.length, 1);
  assert.equal(gaps[0].campo, "contato");
});

test("avaliarLoja: chave PIX não confirmada gera gap 'chave_pix'", () => {
  const gaps = avaliarLoja({
    cnpj: "11.222.333/0001-81", cep: "69000-000", cidade: "Manaus", estado: "AM", rua: "Rua X", numero: "100",
    whatsapp: "92999999999", email: null, chave_pix_confirmada_em: null,
  });
  assert.equal(gaps.length, 1);
  assert.equal(gaps[0].campo, "chave_pix");
});

test("avaliarLoja: combina múltiplos gaps", () => {
  const gaps = avaliarLoja({
    cnpj: null, cep: null, cidade: null, estado: null, rua: null, numero: null,
    whatsapp: null, email: null, chave_pix_confirmada_em: null,
  });
  const campos = gaps.map((g) => g.campo).sort();
  assert.deepEqual(campos, ["chave_pix", "cnpj", "contato", "endereco"]);
});
