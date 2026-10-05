import { test } from "vitest";
import assert from "node:assert/strict";
import {
  rastreavel,
  deveEnviarPosicao,
  minutosDesde,
  estaAoVivo,
  textoUltimaAtualizacao,
} from "./rastreio";

test("só Coletada e EmTransito são rastreáveis", () => {
  assert.equal(rastreavel("Coletada"), true);
  assert.equal(rastreavel("EmTransito"), true);
  for (const s of ["Publicada", "Aceita", "Entregue", "Cancelada", "", null, undefined]) {
    assert.equal(rastreavel(s), false, String(s));
  }
});

const MANAUS = { lat: -3.119, lng: -60.0217 };
// ~0,00045° de latitude ≈ 50 m
const A_60M = { lat: MANAUS.lat + 0.00054, lng: MANAUS.lng };
const A_20M = { lat: MANAUS.lat + 0.00018, lng: MANAUS.lng };

test("primeiro ponto sempre é enviado", () => {
  assert.equal(deveEnviarPosicao(null, { ...MANAUS, em: 0 }), true);
});

test("parado: só reenvia depois de 20 s", () => {
  const ultimo = { ...MANAUS, em: 0 };
  assert.equal(deveEnviarPosicao(ultimo, { ...MANAUS, em: 19_999 }), false);
  assert.equal(deveEnviarPosicao(ultimo, { ...MANAUS, em: 20_000 }), true);
});

test("andou 50 m ou mais: envia antes dos 20 s", () => {
  const ultimo = { ...MANAUS, em: 0 };
  assert.equal(deveEnviarPosicao(ultimo, { ...A_60M, em: 5_000 }), true);
  assert.equal(deveEnviarPosicao(ultimo, { ...A_20M, em: 5_000 }), false);
});

test("ao vivo até 3 minutos desde a última posição", () => {
  const agora = new Date("2026-10-05T12:00:00Z").getTime();
  assert.equal(minutosDesde("2026-10-05T11:58:00Z", agora), 2);
  assert.equal(estaAoVivo("2026-10-05T11:57:01Z", agora), true);
  assert.equal(estaAoVivo("2026-10-05T11:57:00Z", agora), false);
});

test("texto da última atualização", () => {
  const agora = new Date("2026-10-05T12:00:00Z").getTime();
  assert.equal(textoUltimaAtualizacao("2026-10-05T11:59:40Z", agora), "Ao vivo");
  assert.equal(textoUltimaAtualizacao("2026-10-05T11:55:00Z", agora), "Última atualização há 5 min");
  assert.equal(textoUltimaAtualizacao("2026-10-05T10:00:00Z", agora), "Última atualização há 120 min");
});
