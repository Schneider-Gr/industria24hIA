// Check das regras puras de disputa (PRD 009/010). Ver src/lib/disputas.ts.

import assert from "node:assert/strict";
import {
  podeAbrirDisputa,
  podeEscalar,
  slaLojaVenceEm,
  validarFotosAbertura,
  validarMotivo,
  validarValorReembolso,
} from "./disputas";

const entrega = new Date("2026-08-01T12:00:00Z");

// Janela padrão (7 dias): dentro e fora do prazo.
assert.equal(podeAbrirDisputa(entrega, false, new Date("2026-08-08T11:59:00Z")), true);
assert.equal(podeAbrirDisputa(entrega, false, new Date("2026-08-08T12:01:00Z")), false);

// Janela perecível (24h): dentro e fora do prazo.
assert.equal(podeAbrirDisputa(entrega, true, new Date("2026-08-02T11:59:00Z")), true);
assert.equal(podeAbrirDisputa(entrega, true, new Date("2026-08-02T12:01:00Z")), false);

// SLA da loja (48h a partir da abertura).
const aberta = new Date("2026-08-01T00:00:00Z");
const vence = slaLojaVenceEm(aberta);
assert.equal(podeEscalar(vence, new Date("2026-08-02T23:59:00Z")), false);
assert.equal(podeEscalar(vence, new Date("2026-08-03T00:01:00Z")), true);

// Foto obrigatória só para perecível.
assert.throws(() => validarFotosAbertura(true, 0), /exige ao menos uma foto/);
validarFotosAbertura(true, 1);
validarFotosAbertura(false, 0);

// Motivo "produto_estragado_ou_vencido" só para perecível.
assert.throws(() => validarMotivo("produto_estragado_ou_vencido", false), /só disponível/);
validarMotivo("produto_estragado_ou_vencido", true);
validarMotivo("produto_avariado", false);

// Reembolso parcial não pode exceder o valor do item.
assert.throws(() => validarValorReembolso("reembolso_parcial", 150, 100), /não pode ser maior/);
assert.throws(() => validarValorReembolso("reembolso_parcial", null, 100), /Informe o valor/);
validarValorReembolso("reembolso_parcial", 50, 100);
validarValorReembolso("reembolso_total", null, 100);

console.log("ok: regras de disputa (janela, SLA, foto, motivo, reembolso parcial)");
