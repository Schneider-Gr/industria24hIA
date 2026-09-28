import assert from "node:assert/strict";
import { test } from "vitest";
import {
  observacaoTemContato,
  textoValorCotacao,
  textoPrazoCotacao,
  exibirEntregaACombinar,
  mensagemStatusCotacao,
  statusEfetivo,
  ordenarCotacoes,
  avisosDeCotacoes,
  resumoCotacaoParaChat,
  cotacaoCasaComCarrinho,
  type CotacaoLista,
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

const cot = (o: Partial<CotacaoLista>): CotacaoLista => ({
  id: "c",
  status: "aguardando",
  criado_em: "2026-09-28T10:00:00Z",
  responder_ate: "2026-09-29T10:00:00Z",
  valida_ate: null,
  valor_centavos: null,
  prazo_min: null,
  prazo_max: null,
  ...o,
});

test("ordenarCotacoes: respondidas válidas, depois aguardando, depois o resto, recentes primeiro", () => {
  const agora = new Date("2026-09-28T12:00:00Z");
  const lista = ordenarCotacoes(
    [
      cot({ id: "recusada", status: "recusada", criado_em: "2026-09-28T11:00:00Z" }),
      cot({ id: "aguarda", status: "aguardando" }),
      cot({ id: "resp-velha", status: "respondida", valida_ate: "2026-09-30T00:00:00Z", criado_em: "2026-09-27T10:00:00Z" }),
      cot({ id: "resp-nova", status: "respondida", valida_ate: "2026-09-30T00:00:00Z", criado_em: "2026-09-28T09:00:00Z" }),
      cot({ id: "vencida", status: "respondida", valida_ate: "2026-09-28T11:00:00Z" }),
    ],
    agora,
  );
  assert.deepEqual(lista.map((c) => c.id), ["resp-nova", "resp-velha", "aguarda", "recusada", "vencida"]);
  assert.equal(lista.at(-1)!.efetivo, "vencida");
});

test("avisosDeCotacoes: respondida, vencendo em menos de 12 h, recusada e expirada; aguardando e usada não", () => {
  const agora = new Date("2026-09-28T12:00:00Z");
  const avisos = avisosDeCotacoes(
    [
      cot({ id: "a", status: "respondida", valida_ate: "2026-09-30T12:00:00Z", valor_centavos: 2980, prazo_min: 1, prazo_max: 2 }),
      cot({ id: "b", status: "respondida", valida_ate: "2026-09-28T20:00:00Z", valor_centavos: 0, prazo_min: 1, prazo_max: 1 }),
      cot({ id: "c", status: "recusada" }),
      cot({ id: "d", status: "aguardando", responder_ate: "2026-09-28T11:00:00Z" }),
      cot({ id: "e", status: "aguardando" }),
      cot({ id: "f", status: "usada" }),
    ],
    agora,
  );
  assert.deepEqual(avisos.map((a) => a.chave), ["cotacao-a", "cotacao-b", "cotacao-c", "cotacao-d"]);
  assert.match(avisos[0].titulo, /respondeu/);
  assert.match(avisos[1].titulo, /vence em menos de 12 horas/);
  assert.match(avisos[2].titulo, /não entrega/);
  assert.match(avisos[3].titulo, /não respondeu/);
  assert.equal(avisos[0].href, "/minhas-cotacoes");
});

test("resumoCotacaoParaChat traz o combinado sem dado de contato", () => {
  const texto = resumoCotacaoParaChat({
    itens: [{ nome: "Polpa de Cupuaçu", quantidade: 10 }],
    cep: "69050000",
    bairro: "São Geraldo",
    cidade: "Manaus",
    observacao: "portão azul",
    valor_centavos: 2980,
    prazo_min: 1,
    prazo_max: 2,
  });
  assert.match(texto, /Polpa de Cupuaçu: 10 un\./);
  assert.match(texto, /69050-000/);
  assert.match(texto, /R\$\s29,80/);
  assert.match(texto, /de 1 a 2 dias úteis/);
  assert.match(texto, /portão azul/);
});

test("statusEfetivo aplica prazo de resposta e validade", () => {
  const agora = new Date("2026-09-28T12:00:00Z");
  assert.equal(statusEfetivo({ status: "aguardando", responder_ate: "2026-09-28T11:00:00Z", valida_ate: null }, agora), "expirada");
  assert.equal(statusEfetivo({ status: "aguardando", responder_ate: "2026-09-28T13:00:00Z", valida_ate: null }, agora), "aguardando");
  assert.equal(statusEfetivo({ status: "respondida", responder_ate: "x", valida_ate: "2026-09-28T11:00:00Z" }, agora), "vencida");
  assert.equal(statusEfetivo({ status: "respondida", responder_ate: "x", valida_ate: "2026-09-29T11:00:00Z" }, agora), "respondida");
});

test("cotacaoCasaComCarrinho: mesmos produtos e quantidades da loja no carrinho", () => {
  const carrinho = [
    { produto_id: "coco", quantidade: 10, loja_id: "L" },
    { produto_id: "acai", quantidade: 5, loja_id: "L" },
    { produto_id: "outro", quantidade: 1, loja_id: "M" },
  ];
  assert.equal(cotacaoCasaComCarrinho([{ produto_id: "coco", quantidade: 10 }], "L", carrinho), true);
  assert.equal(cotacaoCasaComCarrinho([{ produto_id: "coco", quantidade: 12 }], "L", carrinho), false);
  assert.equal(cotacaoCasaComCarrinho([{ produto_id: "coco", quantidade: 10 }], "M", carrinho), false);
  assert.equal(cotacaoCasaComCarrinho([], "L", carrinho), false);
});
