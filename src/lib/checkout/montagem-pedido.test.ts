import assert from "node:assert/strict";
import { test } from "vitest";
import {
  agruparItensPorLoja,
  montarEntregaDaLoja,
  validarGateMercadoFuturo,
} from "./montagem-pedido";

const item = (loja: string, produto: string) => ({
  produto_id: produto,
  quantidade: 1,
  loja_id: loja,
});

test("agruparItensPorLoja junta por loja preservando a ordem de chegada", () => {
  const grupos = agruparItensPorLoja([
    item("loja-a", "p1"),
    item("loja-b", "p2"),
    item("loja-a", "p3"),
  ]);
  assert.deepEqual([...grupos.keys()], ["loja-a", "loja-b"]);
  assert.deepEqual(
    grupos.get("loja-a")!.map((i) => i.produto_id),
    ["p1", "p3"],
  );
  assert.equal(grupos.get("loja-b")!.length, 1);
  assert.equal(agruparItensPorLoja([]).size, 0);
});

const retirada = { tipo: "retirada" };
const endereco = { tipo: "entrega", cep: "90050100", rua: "R. X", numero: "1" };

test("montarEntregaDaLoja só anexa transportadora em entrega com frete escolhido", () => {
  const frete = { transportadora_id: "t-1", cotacao_uber_direct_id: null };

  // Entrega com transportadora: viaja dentro de `entrega`.
  const comFrete = montarEntregaDaLoja({
    entrega: endereco,
    tipo: "entrega",
    freteLoja: frete,
    cupomCodigo: null,
    checkoutRef: "ref-1",
  });
  assert.equal(comFrete.transportadora_id, "t-1");
  assert.equal(comFrete.cotacao_externa_id, null);
  assert.equal(comFrete.cep, "90050100");

  // Retirada nunca leva transportadora, mesmo com frete no formulário.
  const naRetirada = montarEntregaDaLoja({
    entrega: retirada,
    tipo: "retirada",
    freteLoja: frete,
    cupomCodigo: null,
    checkoutRef: "ref-1",
  });
  assert.equal("transportadora_id" in naRetirada, false);

  // Loja sem frete escolhido no checkout multiloja.
  const semFrete = montarEntregaDaLoja({
    entrega: endereco,
    tipo: "entrega",
    freteLoja: undefined,
    cupomCodigo: null,
    checkoutRef: "ref-1",
  });
  assert.equal("transportadora_id" in semFrete, false);

  // Uber Direct: a cotação externa acompanha a transportadora.
  const uber = montarEntregaDaLoja({
    entrega: endereco,
    tipo: "entrega",
    freteLoja: { transportadora_id: "t-uber", cotacao_uber_direct_id: "cot-9" },
    cupomCodigo: null,
    checkoutRef: "ref-1",
  });
  assert.equal(uber.cotacao_externa_id, "cot-9");
});

test("montarEntregaDaLoja carimba o mesmo checkout_ref com e sem transportadora", () => {
  // Cupom em retirada (sem transportadora) — o caso que o ternário aninhado
  // original tratava num ramo separado.
  const semTransp = montarEntregaDaLoja({
    entrega: retirada,
    tipo: "retirada",
    freteLoja: undefined,
    cupomCodigo: "BEMVINDO",
    checkoutRef: "ref-unico",
  });
  assert.equal(semTransp.cupom_codigo, "BEMVINDO");
  assert.equal(semTransp.checkout_ref, "ref-unico");

  // Mesmo cupom, agora com transportadora: um único uso em cupom_usos depende
  // de o checkout_ref ser idêntico nos dois pedidos do mesmo checkout.
  const comTransp = montarEntregaDaLoja({
    entrega: endereco,
    tipo: "entrega",
    freteLoja: { transportadora_id: "t-1", cotacao_uber_direct_id: null },
    cupomCodigo: "BEMVINDO",
    checkoutRef: "ref-unico",
  });
  assert.equal(comTransp.checkout_ref, "ref-unico");
  assert.equal(comTransp.transportadora_id, "t-1");

  // Sem cupom, nenhum dos dois campos aparece.
  const semCupom = montarEntregaDaLoja({
    entrega: endereco,
    tipo: "entrega",
    freteLoja: undefined,
    cupomCodigo: null,
    checkoutRef: "ref-unico",
  });
  assert.equal("cupom_codigo" in semCupom, false);
  assert.equal("checkout_ref" in semCupom, false);
});

test("validarGateMercadoFuturo exige documento PJ e aceite dos termos", () => {
  const base = {
    documentoTipo: "CNPJ",
    documentoPj: "12345678000199",
    produtorRural: false,
    razaoSocial: "Fazenda X LTDA",
    aceitouTermos: true,
  };

  const ok = validarGateMercadoFuturo(base);
  assert.equal(ok.ok, true);
  assert.equal(ok.ok && ok.perfil.documentoPj, "12345678000199");

  // Documento faltando, em qualquer das duas metades.
  assert.equal(validarGateMercadoFuturo({ ...base, documentoTipo: "" }).ok, false);
  assert.equal(validarGateMercadoFuturo({ ...base, documentoPj: "" }).ok, false);

  // Documento presente mas termos não aceitos: erro é o dos termos, não o do
  // documento — a ordem dos gates importa para a mensagem que o comprador vê.
  const semTermos = validarGateMercadoFuturo({ ...base, aceitouTermos: false });
  assert.equal(semTermos.ok, false);
  assert.match(!semTermos.ok ? semTermos.error : "", /Termos de Compra do Mercado Futuro/);

  // Produtor rural sem razão social é caso legítimo (IE de pessoa física).
  const rural = validarGateMercadoFuturo({
    ...base,
    documentoTipo: "IE",
    produtorRural: true,
    razaoSocial: null,
  });
  assert.equal(rural.ok, true);
  assert.equal(rural.ok && rural.perfil.razaoSocial, null);
});
