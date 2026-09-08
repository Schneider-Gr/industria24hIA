// Check da ordenação por proximidade (PRD 030, fase 3). O que importa: nada
// pode SUMIR da lista, e produto sem coordenada ou fora do raio vai para o fim
// sem embaralhar a ordem que veio do banco.

import assert from "node:assert/strict";
import { test } from "vitest";

import { ordenarPorPesos, pesoDeProximidade, type OrigemProduto } from "./proximidade-ordem";

const PORTO_ALEGRE = { lat: -30.0346, lon: -51.2177 };
const CANOAS = { lat: -29.9177, lon: -51.1836 };
const MANAUS = { lat: -3.119, lon: -60.0217 };

const coordenadas = new Map([
  ["90050100", PORTO_ALEGRE],
  ["92010000", CANOAS],
  ["69088068", MANAUS],
]);

const origem = (cep: string | null, raioKm: number | null = null): OrigemProduto => ({ cep, raioKm });

test("ordena por distância sem perder nenhum item", () => {
  const itens = [{ id: "manaus" }, { id: "canoas" }, { id: "poa" }];
  const origens = new Map([
    ["manaus", origem("69088068")],
    ["canoas", origem("92010000")],
    ["poa", origem("90050100")],
  ]);

  const ordenado = ordenarPorPesos(itens, origens, coordenadas, PORTO_ALEGRE);

  assert.deepEqual(ordenado.map((i) => i.id), ["poa", "canoas", "manaus"]);
  assert.equal(ordenado.length, itens.length);
});

test("sem CEP e fora do raio vão para o fim, na ordem original", () => {
  const itens = [{ id: "sem_cep_a" }, { id: "fora_do_raio" }, { id: "sem_cep_b" }, { id: "perto" }];
  const origens = new Map([
    ["sem_cep_a", origem(null)],
    // Manaus fica a ~3100 km de Porto Alegre: raio de 50 km não alcança.
    ["fora_do_raio", origem("69088068", 50)],
    ["sem_cep_b", origem("92010000")], // CEP sem coordenada conhecida no cache
    ["perto", origem("90050100")],
  ]);
  const semCanoas = new Map([["90050100", PORTO_ALEGRE], ["69088068", MANAUS]]);

  const ordenado = ordenarPorPesos(itens, origens, semCanoas, PORTO_ALEGRE);

  assert.deepEqual(ordenado.map((i) => i.id), ["perto", "sem_cep_a", "fora_do_raio", "sem_cep_b"]);
});

test("raio maior que a distância mantém o produto na posição por distância", () => {
  const km = pesoDeProximidade(origem("92010000", 100), coordenadas, PORTO_ALEGRE);
  assert.ok(km > 0 && km < 100, `Canoas-POA fora do esperado: ${km}`);
  assert.equal(pesoDeProximidade(origem("92010000", 5), coordenadas, PORTO_ALEGRE), Infinity);
});

test("produto sem origem conhecida não quebra e vai para o fim", () => {
  assert.equal(pesoDeProximidade(undefined, coordenadas, PORTO_ALEGRE), Infinity);
  assert.equal(pesoDeProximidade(origem(null), coordenadas, PORTO_ALEGRE), Infinity);
});
