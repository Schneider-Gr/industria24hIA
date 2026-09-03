// Check da regra de cupom de desconto no checkout (função SQL cupom_aplicar,
// migration 0156). Custeio 100% pela margem da plataforma: o desconto por linha
// nunca passa do repasse_ind da linha, não altera linha_itens.valor, e não
// acumula com o desconto progressivo (aplica o melhor por item).
//
// ponytail: réplica pura da função SQL — se a regra mudar na migration, mude
// aqui também.

import assert from "node:assert/strict";
import { test } from "vitest";
import {
  aplicarCupom,
  precoUnitarioComCupomLoja,
  type RegraCupom,
  type ItemCupom,
} from "./cupom-desconto";

// Item base: preço cheio 100, sem faixa progressiva (preco_faixa = preco_base),
// 2 unidades, repasse_ind = 5% de 200 = 10.
const item = (over: Partial<ItemCupom> = {}): ItemCupom => ({
  produto_id: "p1",
  categoria_id: "c1",
  loja_id: "l1",
  preco_base: 100,
  preco_faixa: 100,
  quantidade: 2,
  repasse_ind: 10,
  ...over,
});

test("sem regra casando: desconto zero", () => {
  const regras: RegraCupom[] = [{ alvo: "produto", alvo_id: "outro", tipo: "percentual", valor: 50 }];
  assert.deepEqual(aplicarCupom(regras, [item()]), [{ produto_id: "p1", desconto: 0 }]);
});

test("precedência: regra de produto vence regra de tudo", () => {
  const regras: RegraCupom[] = [
    { alvo: "tudo", alvo_id: null, tipo: "percentual", valor: 5 },
    { alvo: "produto", alvo_id: "p1", tipo: "percentual", valor: 20 },
  ];
  // 20% de 100 = 20/un × 2 = 40, mas piso repasse_ind = 10.
  assert.deepEqual(aplicarCupom(regras, [item({ repasse_ind: 100 })]), [
    { produto_id: "p1", desconto: 40 },
  ]);
});

test("precedência: categoria vence loja e tudo", () => {
  const regras: RegraCupom[] = [
    { alvo: "tudo", alvo_id: null, tipo: "percentual", valor: 5 },
    { alvo: "loja", alvo_id: "l1", tipo: "percentual", valor: 10 },
    { alvo: "categoria", alvo_id: "c1", tipo: "percentual", valor: 30 },
  ];
  // 30% de 100 = 30/un × 2 = 60, piso 100 → 60.
  assert.deepEqual(aplicarCupom(regras, [item({ repasse_ind: 100 })]), [
    { produto_id: "p1", desconto: 60 },
  ]);
});

test("regra de loja cobre item sem regra mais específica", () => {
  const regras: RegraCupom[] = [{ alvo: "loja", alvo_id: "l1", tipo: "percentual", valor: 10 }];
  // 10% de 100 = 10/un × 2 = 20, piso 100 → 20.
  assert.deepEqual(aplicarCupom(regras, [item({ repasse_ind: 100 })]), [
    { produto_id: "p1", desconto: 20 },
  ]);
});

test("valor_fixo maior que o preço: desconto no máximo o preço unitário", () => {
  const regras: RegraCupom[] = [{ alvo: "produto", alvo_id: "p1", tipo: "valor_fixo", valor: 150 }];
  // desconto fixo 150 > preço base 100 → preço com cupom clampa em 0, item sai
  // de graça: desconto = preço de faixa (100)/un × 2 = 200, repasse_ind não limita.
  assert.deepEqual(aplicarCupom(regras, [item({ repasse_ind: 1000 })]), [
    { produto_id: "p1", desconto: 200 },
  ]);
});

test("não acumula: faixa progressiva melhor que o cupom → desconto zero", () => {
  const regras: RegraCupom[] = [{ alvo: "produto", alvo_id: "p1", tipo: "percentual", valor: 10 }];
  // preco_cupom = 90; preco_faixa = 80 (progressivo já é melhor) → 0.
  assert.deepEqual(aplicarCupom(regras, [item({ preco_faixa: 80, repasse_ind: 100 })]), [
    { produto_id: "p1", desconto: 0 },
  ]);
});

test("não acumula: cupom melhor que a faixa → abate só a diferença", () => {
  const regras: RegraCupom[] = [{ alvo: "produto", alvo_id: "p1", tipo: "percentual", valor: 25 }];
  // preco_cupom = 75; preco_faixa = 90 → diferença 15/un × 2 = 30, piso 100 → 30.
  assert.deepEqual(aplicarCupom(regras, [item({ preco_faixa: 90, repasse_ind: 100 })]), [
    { produto_id: "p1", desconto: 30 },
  ]);
});

test("piso: desconto da linha limitado ao repasse_ind da linha", () => {
  const regras: RegraCupom[] = [{ alvo: "produto", alvo_id: "p1", tipo: "percentual", valor: 40 }];
  // 40% de 100 = 40/un × 2 = 80, mas repasse_ind = 10 → 10.
  assert.deepEqual(aplicarCupom(regras, [item({ repasse_ind: 10 })]), [
    { produto_id: "p1", desconto: 10 },
  ]);
});

test("linha sem margem (repasse_ind = 0): não recebe desconto", () => {
  const regras: RegraCupom[] = [{ alvo: "tudo", alvo_id: null, tipo: "percentual", valor: 50 }];
  assert.deepEqual(aplicarCupom(regras, [item({ repasse_ind: 0 })]), [
    { produto_id: "p1", desconto: 0 },
  ]);
});

test("multi-item: cada linha avaliada isoladamente", () => {
  const regras: RegraCupom[] = [
    { alvo: "produto", alvo_id: "p1", tipo: "percentual", valor: 20 },
    { alvo: "loja", alvo_id: "l1", tipo: "valor_fixo", valor: 5 },
  ];
  const itens = [
    item({ produto_id: "p1", repasse_ind: 100 }),
    item({ produto_id: "p2", categoria_id: "c9", repasse_ind: 100 }),
  ];
  // p1: regra de produto 20% → 20/un × 2 = 40.
  // p2: sem regra de produto/categoria, cai na de loja valor_fixo 5 → 5/un × 2 = 10.
  assert.deepEqual(aplicarCupom(regras, itens), [
    { produto_id: "p1", desconto: 40 },
    { produto_id: "p2", desconto: 10 },
  ]);
});

test("arredonda para centavos", () => {
  const regras: RegraCupom[] = [{ alvo: "produto", alvo_id: "p1", tipo: "percentual", valor: 33.33 }];
  // 33.33% de 100 = 33.33/un × 3 = 99.99, piso alto.
  assert.deepEqual(
    aplicarCupom(regras, [item({ quantidade: 3, repasse_ind: 1000 })]),
    [{ produto_id: "p1", desconto: 99.99 }],
  );
});

// --- cupom de loja: preço final substitui linha_itens.valor, sem piso ---

test("cupom de loja: regra de produto reduz o preço unitário", () => {
  const regras: RegraCupom[] = [{ alvo: "produto", alvo_id: "p1", tipo: "percentual", valor: 25 }];
  // 25% de 100 = preço final 75.
  assert.equal(precoUnitarioComCupomLoja(regras, item()), 75);
});

test("cupom de loja: regra de loja cobre produto sem regra específica", () => {
  const regras: RegraCupom[] = [{ alvo: "loja", alvo_id: "l1", tipo: "valor_fixo", valor: 10 }];
  assert.equal(precoUnitarioComCupomLoja(regras, item()), 90);
});

test("cupom de loja: sem regra casando, preço final é o de faixa", () => {
  const regras: RegraCupom[] = [{ alvo: "produto", alvo_id: "outro", tipo: "percentual", valor: 50 }];
  assert.equal(precoUnitarioComCupomLoja(regras, item({ preco_faixa: 90 })), 90);
});

test("cupom de loja: progressivo melhor que o cupom prevalece", () => {
  const regras: RegraCupom[] = [{ alvo: "produto", alvo_id: "p1", tipo: "percentual", valor: 10 }];
  // cupom daria 90, faixa já é 80 — fica 80.
  assert.equal(precoUnitarioComCupomLoja(regras, item({ preco_faixa: 80 })), 80);
});

test("cupom de loja: cupom melhor que o progressivo prevalece", () => {
  const regras: RegraCupom[] = [{ alvo: "produto", alvo_id: "p1", tipo: "percentual", valor: 30 }];
  // cupom daria 70, faixa é 90 — fica 70.
  assert.equal(precoUnitarioComCupomLoja(regras, item({ preco_faixa: 90 })), 70);
});

test("cupom de loja: sem piso — desconto agressivo é aplicado mesmo com repasse_ind baixo", () => {
  const regras: RegraCupom[] = [{ alvo: "produto", alvo_id: "p1", tipo: "percentual", valor: 90 }];
  // 90% de 100 = 10, mesmo com repasse_ind = 1 (que travaria o cupom de plataforma).
  assert.equal(precoUnitarioComCupomLoja(regras, item({ repasse_ind: 1 })), 10);
});
