import assert from "node:assert/strict";
import { test } from "vitest";
import { cotarParceiroLocal, type ItemParceiroLocal } from "./frete-parceiro-local";
import { simularRegiao, type Bandas } from "./simulador-km";

const carro = (tarifaMinima: number | null, valorKm: number | null): Bandas => ({
  moto: {},
  carro: { tarifaMinima, valorKm },
  caminhao: {},
});
const item = (over: Partial<ItemParceiroLocal> = {}): ItemParceiroLocal => ({
  pesoUnitKg: 50,
  quantidade: 1,
  permiteParceiro: true,
  bandas: carro(8, 1),
  ...over,
});

test("PRD 056: perto vale km, médio vale a tarifa mínima (carro 8 / R$ 1)", () => {
  const perto = cotarParceiroLocal({ itens: [item()], distanciaM: 10_400 });
  assert.ok(perto.ok);
  assert.equal(perto.classe, "carro");
  assert.equal(perto.total, 10.4);
  const medio = cotarParceiroLocal({ itens: [item()], distanciaM: 7_800 });
  assert.ok(medio.ok);
  assert.equal(medio.total, 8);
});

test("PRD 056: banda única = maior tarifa e maior R$/km entre os itens (exemplo da dona)", () => {
  // carro, 10 km, A 8/1,00, B 10/0,80, C 8/1,50 → maior(10; 15) = 15
  const r = cotarParceiroLocal({
    itens: [item({ bandas: carro(8, 1) }), item({ bandas: carro(10, 0.8) }), item({ bandas: carro(8, 1.5) })],
    distanciaM: 10_000,
  });
  assert.ok(r.ok);
  assert.equal(r.tarifaMinima, 10);
  assert.equal(r.valorKm, 1.5);
  assert.equal(r.total, 15);
});

test("PRD 056: classe pelo peso total do carrinho da loja", () => {
  const moto: Bandas = { moto: { tarifaMinima: 6, valorKm: 0.4 }, carro: {}, caminhao: {} };
  const r = cotarParceiroLocal({ itens: [item({ pesoUnitKg: 2, quantidade: 5, bandas: moto })], distanciaM: 5_000 });
  assert.ok(r.ok);
  assert.equal(r.classe, "moto");
  assert.equal(r.pesoKg, 10);
  assert.equal(r.total, 6);
  // 12 un. × 2 kg = 24 kg: exige carro, e o produto não tem banda de carro
  const semBanda = cotarParceiroLocal({ itens: [item({ pesoUnitKg: 2, quantidade: 12, bandas: moto })], distanciaM: 5_000 });
  assert.deepEqual(semBanda, { ok: false, motivo: "sem_banda" });
});

test("PRD 056: mesmo valor do simulador do avião para o mesmo produto, quantidade e rota", () => {
  const bandas: Bandas = { moto: { tarifaMinima: 6, valorKm: 0.4 }, carro: { tarifaMinima: 8, valorKm: 1.2 }, caminhao: { tarifaMinima: 20, valorKm: 2 } };
  for (const [qtd, distanciaM] of [[3, 12_345], [40, 151_400], [400, 2_000]] as const) {
    const sim = simularRegiao({ distanciaM, pesoUnitKg: 1.5, preco: 12, qtd, bandas });
    const r = cotarParceiroLocal({ itens: [item({ pesoUnitKg: 1.5, quantidade: qtd, bandas })], distanciaM });
    assert.ok(r.ok);
    assert.equal(r.total, sim.frete.total);
  }
});

test("PRD 056: partida = destino (0 km) vale a tarifa mínima", () => {
  const r = cotarParceiroLocal({ itens: [item()], distanciaM: 0 });
  assert.ok(r.ok);
  assert.equal(r.total, 8);
});

test("PRD 056: banda com R$/km e sem tarifa mínima cobra só o km", () => {
  const r = cotarParceiroLocal({ itens: [item({ bandas: carro(null, 1) })], distanciaM: 3_000 });
  assert.ok(r.ok);
  assert.equal(r.total, 3);
});

test("PRD 056: a opção some quando algum item não pode ir por parceiro", () => {
  assert.deepEqual(cotarParceiroLocal({ itens: [item(), item({ permiteParceiro: false })], distanciaM: 1_000 }), {
    ok: false,
    motivo: "item_sem_parceiro",
  });
  assert.deepEqual(cotarParceiroLocal({ itens: [item({ pesoUnitKg: null })], distanciaM: 1_000 }), { ok: false, motivo: "sem_peso" });
  assert.deepEqual(cotarParceiroLocal({ itens: [item(), item({ bandas: carro(8, null) })], distanciaM: 1_000 }), {
    ok: false,
    motivo: "sem_banda",
  });
  assert.deepEqual(cotarParceiroLocal({ itens: [], distanciaM: 1_000 }), { ok: false, motivo: "item_sem_parceiro" });
});

test("PRD 056: rota com barco soma a balsa da classe sozinha e tira o barco do km", () => {
  const r = cotarParceiroLocal({
    itens: [item()],
    distanciaM: 151_400,
    barcoM: 10_000,
    balsa: { moto: 20, carro: 46.01, caminhao: 120 },
  });
  assert.ok(r.ok);
  assert.equal(r.km, 141.4);
  assert.equal(r.balsa, 46.01);
  assert.equal(r.total, 187.41);
});

test("PRD 056: barco sem valor de balsa para a classe → a opção não aparece", () => {
  assert.deepEqual(cotarParceiroLocal({ itens: [item()], distanciaM: 20_000, barcoM: 3_000 }), {
    ok: false,
    motivo: "travessia_sem_tabela",
  });
  assert.deepEqual(
    cotarParceiroLocal({ itens: [item()], distanciaM: 20_000, barcoM: 3_000, balsa: { moto: 10, carro: null } }),
    { ok: false, motivo: "travessia_sem_tabela" },
  );
});
