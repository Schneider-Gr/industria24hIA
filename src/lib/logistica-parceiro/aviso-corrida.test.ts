import { test } from "vitest";
import assert from "node:assert/strict";
import { avisoNovaCorrida } from "./aviso-corrida";

test("corrida exclusiva: avisa o prazo e abre a tela do afiliado", () => {
  const a = avisoNovaCorrida({
    id: "c1",
    destino: "Rua 10 de Julho, 100, Centro, Manaus, 69010060",
    valor: 8,
    distanciaM: 2450,
    exclusiva: true,
  });
  assert.equal(a.titulo, "Nova corrida para você (5 min para aceitar)");
  assert.equal(a.corpo, "R$ 8,00 · 2,5 km\nRua 10 de Julho, 100, Centro, Manaus, 69010060");
  assert.equal(a.url, "/afiliado/logistica");
  assert.equal(a.tag, "corrida-c1");
});

test("corrida no pool abre a tela do parceiro", () => {
  const a = avisoNovaCorrida({ id: "c2", destino: "Rua A", valor: null, distanciaM: null, exclusiva: false });
  assert.equal(a.titulo, "Nova corrida disponível");
  assert.equal(a.corpo, "Rua A");
  assert.equal(a.url, "/parceiro");
});

test("lote: conta as entregas e mostra só a primeira parada", () => {
  const a = avisoNovaCorrida({
    id: "c3",
    destino: "1. Rua A, 1, Centro (+5 min da coleta) | 2. Rua B, 2, Centro (+12 min da coleta)",
    valor: 21,
    distanciaM: 0,
    exclusiva: true,
    entregas: 2,
  });
  assert.equal(a.corpo, "R$ 21,00 · 2 entregas\nRua A, 1, Centro (+5 min da coleta)");
});
