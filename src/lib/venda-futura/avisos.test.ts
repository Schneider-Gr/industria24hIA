import assert from "node:assert/strict";
import { test } from "vitest";
import { marcoDoDia, somarDias, hojeManaus, DIAS_ANTECEDENCIA_VESPERA } from "./avisos";

test("previsão igual a hoje dispara o aviso do dia", () => {
  assert.equal(marcoDoDia("2026-09-16", "2026-09-16"), "no_dia");
});

test("previsão na antecedência configurada dispara a véspera", () => {
  assert.equal(marcoDoDia(somarDias("2026-09-16", DIAS_ANTECEDENCIA_VESPERA), "2026-09-16"), "vespera");
});

test("qualquer outra data não dispara nada", () => {
  assert.equal(marcoDoDia("2026-09-17", "2026-09-16"), null);
  assert.equal(marcoDoDia("2026-09-30", "2026-09-16"), null);
  assert.equal(marcoDoDia("2026-09-10", "2026-09-16"), null);
  assert.equal(marcoDoDia(null, "2026-09-16"), null);
});

test("somarDias atravessa a virada de mês sem escorregar de fuso", () => {
  assert.equal(somarDias("2026-09-30", 2), "2026-10-02");
  assert.equal(somarDias("2026-12-31", 1), "2027-01-01");
});

test("hoje usa o fuso de Manaus, não o UTC do servidor", () => {
  // 17/09 00:30 UTC ainda é 16/09 em Manaus (UTC-4).
  assert.equal(hojeManaus(new Date("2026-09-17T00:30:00Z")), "2026-09-16");
});
