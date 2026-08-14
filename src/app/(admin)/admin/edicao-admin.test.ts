// Check das validações de entrada das edições do admin (produto e loja).
//
// ponytail: replica a decisão em vez de importar as actions, que são
// "use server" e arrastariam o cliente Supabase. Se a regra mudar lá, mude aqui.

import assert from "node:assert/strict";
import { test } from "vitest";

test("edicao-admin", () => {
type Erro = string | null;

function validarProduto(campos: {
  id: string | null;
  nome: string | null;
  valor: number | null;
  porcentagemAfiliado: number | null;
}): Erro {
  if (!campos.id) return "Produto inválido.";
  if (!campos.nome) return "O nome do produto é obrigatório.";
  if (campos.valor == null) return "Informe um valor válido.";
  if (
    campos.porcentagemAfiliado != null &&
    (campos.porcentagemAfiliado < 0 || campos.porcentagemAfiliado > 100)
  ) {
    return "A porcentagem de afiliado deve estar entre 0 e 100.";
  }
  return null;
}

function validarLoja(campos: { id: string | null; nome: string | null }): Erro {
  if (!campos.id) return "Loja inválida.";
  if (!campos.nome) return "O nome da loja é obrigatório.";
  return null;
}

const produtoOk = { id: "p1", nome: "Chapa", valor: 10, porcentagemAfiliado: 5 };
assert.equal(validarProduto(produtoOk), null);
assert.match(validarProduto({ ...produtoOk, id: null })!, /Produto inv/);
assert.match(validarProduto({ ...produtoOk, nome: null })!, /nome do produto/);
// valor 0 é válido; ausente não.
assert.equal(validarProduto({ ...produtoOk, valor: 0 }), null);
assert.match(validarProduto({ ...produtoOk, valor: null })!, /valor v/);
assert.match(validarProduto({ ...produtoOk, porcentagemAfiliado: 101 })!, /entre 0 e 100/);
assert.match(validarProduto({ ...produtoOk, porcentagemAfiliado: -1 })!, /entre 0 e 100/);
assert.equal(validarProduto({ ...produtoOk, porcentagemAfiliado: null }), null);

assert.equal(validarLoja({ id: "l1", nome: "Padaria" }), null);
assert.match(validarLoja({ id: null, nome: "Padaria" })!, /Loja inv/);
assert.match(validarLoja({ id: "l1", nome: null })!, /nome da loja/);

console.log("ok: validações de edição do admin");
});
