import assert from "node:assert/strict";
import { test } from "vitest";
import {
  observacaoTemContato,
  textoValorCotacao,
  textoPrazoCotacao,
  exibirEntregaACombinar,
  mensagemStatusCotacao,
  statusEfetivo,
} from "./cotacao-frete";

test("observacaoTemContato barra telefone, e-mail, Pix e link, e deixa CEP passar", () => {
  assert.equal(observacaoTemContato("me liga 92 99999-1234"), true);
  assert.equal(observacaoTemContato("zap (92)99999.1234"), true);
  assert.equal(observacaoTemContato("fulano@gmail.com"), true);
  assert.equal(observacaoTemContato("pix 123e4567-e89b-12d3-a456-426614174000"), true);
  assert.equal(observacaoTemContato("veja www.loja.com"), true);
  assert.equal(observacaoTemContato("https://x.io"), true);
  assert.equal(observacaoTemContato("site loja.com.br"), true);
  assert.equal(observacaoTemContato("entregar no depósito, CEP 69050-000"), false);
  assert.equal(observacaoTemContato("rua sem saída para caminhão, 2 andares"), false);
  assert.equal(observacaoTemContato(""), false);
});

test("textoValorCotacao mostra frete grátis em R$ 0,00", () => {
  assert.equal(textoValorCotacao(0), "Frete grátis combinado com o vendedor");
  assert.match(textoValorCotacao(3500), /^Frete combinado com o vendedor: R\$\s35,00$/);
});

test("textoPrazoCotacao em dias úteis", () => {
  assert.equal(textoPrazoCotacao(2, 3), "de 2 a 3 dias úteis");
  assert.equal(textoPrazoCotacao(1, 1), "1 dia útil");
  assert.equal(textoPrazoCotacao(4, 4), "4 dias úteis");
});

test("exibirEntregaACombinar: flag da loja, opção do produto e região", () => {
  const base = { lojaFlag: true, produtoFlag: true, temFaixas: false, cepNaFaixa: false, ufDestino: "AM", ufOrigem: "AM" };
  assert.equal(exibirEntregaACombinar(base), "mostrar");
  assert.equal(exibirEntregaACombinar({ ...base, lojaFlag: false }), "nao_se_aplica");
  assert.equal(exibirEntregaACombinar({ ...base, produtoFlag: false }), "nao_se_aplica");
  // sem faixa declarada: só a UF de origem
  assert.equal(exibirEntregaACombinar({ ...base, ufDestino: "SP" }), "fora_da_regiao");
  assert.equal(exibirEntregaACombinar({ ...base, ufDestino: null }), "fora_da_regiao");
  // com faixa declarada: vale a faixa, não a UF
  assert.equal(exibirEntregaACombinar({ ...base, temFaixas: true, cepNaFaixa: true, ufDestino: "SP" }), "mostrar");
  assert.equal(exibirEntregaACombinar({ ...base, temFaixas: true, cepNaFaixa: false }), "fora_da_regiao");
});

test("mensagemStatusCotacao cobre todos os estados", () => {
  assert.match(mensagemStatusCotacao({ status: "aguardando", responder_ate: "2026-09-29T12:00:00-04:00" })!, /Aguardando o vendedor/);
  assert.match(mensagemStatusCotacao({ status: "recusada" })!, /não entrega nesse CEP/);
  assert.match(mensagemStatusCotacao({ status: "expirada" })!, /não respondeu a tempo/);
  assert.match(mensagemStatusCotacao({ status: "vencida" })!, /venceu/);
  assert.equal(mensagemStatusCotacao({ status: "respondida" }), null);
});

test("statusEfetivo aplica prazo de resposta e validade", () => {
  const agora = new Date("2026-09-28T12:00:00Z");
  assert.equal(statusEfetivo({ status: "aguardando", responder_ate: "2026-09-28T11:00:00Z", valida_ate: null }, agora), "expirada");
  assert.equal(statusEfetivo({ status: "aguardando", responder_ate: "2026-09-28T13:00:00Z", valida_ate: null }, agora), "aguardando");
  assert.equal(statusEfetivo({ status: "respondida", responder_ate: "x", valida_ate: "2026-09-28T11:00:00Z" }, agora), "vencida");
  assert.equal(statusEfetivo({ status: "respondida", responder_ate: "x", valida_ate: "2026-09-29T11:00:00Z" }, agora), "respondida");
});
