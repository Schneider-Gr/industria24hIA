import { test } from "vitest";
import assert from "node:assert/strict";
import { MAX_PARADAS, montarParadas, sugerirLotes, textoChegada, type PedidoParaLote } from "./rota-lote";

const LOJA_A = "loja-a";
const LOJA_B = "loja-b";
const ped = (id: string, lojaId: string, cep: string, bairro: string | null, hora = "10"): PedidoParaLote => ({
  id,
  lojaId,
  cep,
  bairro,
  criadoEm: `2026-10-06T${hora}:00:00Z`,
});
const centro = { lojaId: LOJA_A, userId: "ent-centro", desde: "2026-01-01", zona: [{ tipo: "bairro", valor: "centro" }] };
const leste = { lojaId: LOJA_A, userId: "ent-leste", desde: "2026-02-01", zona: [{ tipo: "cep_prefixo", valor: "69088" }] };
const semZona = { lojaId: LOJA_A, userId: "ent-livre", desde: "2025-01-01", zona: [] };

test("mesma loja e mesma zona de entregador formam um lote", () => {
  const lotes = sugerirLotes(
    [ped("1", LOJA_A, "69010-060", "Centro"), ped("2", LOJA_A, "69005070", "CENTRO"), ped("3", LOJA_A, "69088000", "Jorge Teixeira")],
    [centro, leste, semZona],
  );
  assert.equal(lotes.length, 2);
  assert.deepEqual(lotes[0], {
    chave: `${LOJA_A}|zona|ent-centro`,
    lojaId: LOJA_A,
    tipo: "zona",
    entregadorId: "ent-centro",
    corredor: null,
    pedidoIds: ["1", "2"],
  });
  assert.equal(lotes[1].entregadorId, "ent-leste");
});

test("lojas diferentes nunca no mesmo lote, mesmo com destino igual", () => {
  const lotes = sugerirLotes([ped("1", LOJA_A, "69010060", "Centro"), ped("2", LOJA_B, "69010060", "Centro")], [centro]);
  assert.equal(lotes.length, 2);
  assert.deepEqual(lotes.map((l) => l.lojaId).sort(), [LOJA_A, LOJA_B]);
});

test("sem zona que cubra o destino, agrupa pelo corredor de 3 dígitos", () => {
  const lotes = sugerirLotes(
    [ped("1", LOJA_A, "69050-000", "Flores"), ped("2", LOJA_A, "69058111", "Flores"), ped("3", LOJA_A, "69900000", null)],
    [centro, semZona],
  );
  assert.deepEqual(
    lotes.map((l) => [l.tipo, l.corredor, l.pedidoIds]),
    [
      ["corredor", "690", ["1", "2"]],
      ["corredor", "699", ["3"]],
    ],
  );
});

test("dois entregadores atendem o destino: vale o mais antigo", () => {
  const outro = { ...centro, userId: "ent-novo", desde: "2026-06-01" };
  const [lote] = sugerirLotes([ped("1", LOJA_A, "69010060", "Centro")], [outro, centro]);
  assert.equal(lote.entregadorId, "ent-centro");
});

test("grupo acima do limite de paradas é dividido na ordem de chegada", () => {
  const muitos = Array.from({ length: MAX_PARADAS + 3 }, (_, i) =>
    ped(`p${String(i).padStart(2, "0")}`, LOJA_A, "69010060", "Centro", String(10 + (i % 10))),
  );
  const lotes = sugerirLotes(muitos, [centro]);
  assert.deepEqual(lotes.map((l) => l.pedidoIds.length), [MAX_PARADAS, 3]);
  assert.notEqual(lotes[0].chave, lotes[1].chave);
  assert.equal(new Set(lotes.flatMap((l) => l.pedidoIds)).size, MAX_PARADAS + 3);
});

test("paradas seguem a ordem otimizada, com a chegada de cada uma", () => {
  const p = montarParadas(["a", "b", "c"], { ordem: [2, 0, 1], chegadaS: [300.4, 900, 1500] });
  assert.deepEqual(p, [
    { pedidoId: "c", ordem: 1, chegadaS: 300 },
    { pedidoId: "a", ordem: 2, chegadaS: 900 },
    { pedidoId: "b", ordem: 3, chegadaS: 1500 },
  ]);
});

test("sem rota, ou com rota incoerente, vale a ordem de chegada sem previsão", () => {
  const esperado = [
    { pedidoId: "a", ordem: 1, chegadaS: null },
    { pedidoId: "b", ordem: 2, chegadaS: null },
  ];
  assert.deepEqual(montarParadas(["a", "b"], null), esperado);
  assert.deepEqual(montarParadas(["a", "b"], { ordem: [0, 0], chegadaS: [1, 2] }), esperado);
  assert.deepEqual(montarParadas(["a", "b"], { ordem: [0], chegadaS: [1] }), esperado);
  assert.deepEqual(montarParadas(["a", "b"], { ordem: [0, 5], chegadaS: [1, 2] }), esperado);
});

test("texto da chegada", () => {
  assert.equal(textoChegada(null), "sem previsão");
  assert.equal(textoChegada(20), "+1 min");
  assert.equal(textoChegada(1500), "+25 min");
  assert.equal(textoChegada(3600), "+1 h");
  assert.equal(textoChegada(4200), "+1 h 10 min");
});
