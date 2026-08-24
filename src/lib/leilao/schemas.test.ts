import { test } from "vitest";
import assert from "node:assert/strict";
import { publicarLeilaoSchema, darLanceLeilaoSchema, adjudicarLeilaoSchema } from "./schemas";

const UUID = "11111111-1111-4111-8111-111111111111";
const UUID2 = "22222222-2222-4222-8222-222222222222";

test("publicarLeilaoSchema rejeita título vazio", () => {
  const r = publicarLeilaoSchema.safeParse({
    titulo: "  ",
    descricao: "x",
    volume: "10 ton",
    categoria_id: null,
    prazo_desejado: null,
    janela_fim: "2026-09-01",
  });
  assert.equal(r.success, false);
});

test("publicarLeilaoSchema aceita payload completo válido", () => {
  const r = publicarLeilaoSchema.safeParse({
    titulo: "Aço carbono",
    descricao: "Lote de aço",
    volume: "10 ton",
    categoria_id: UUID,
    prazo_desejado: "30 dias",
    janela_fim: "2026-09-01",
  });
  assert.equal(r.success, true);
});

test("darLanceLeilaoSchema rejeita preço não positivo", () => {
  const r = darLanceLeilaoSchema.safeParse({
    leilao_id: UUID,
    preco: 0,
    prazo: "15 dias",
    condicoes: null,
  });
  assert.equal(r.success, false);
});

test("adjudicarLeilaoSchema exige leilao_id e lance_id como uuid", () => {
  assert.equal(
    adjudicarLeilaoSchema.safeParse({ leilao_id: UUID, lance_id: UUID2 }).success,
    true,
  );
  assert.equal(
    adjudicarLeilaoSchema.safeParse({ leilao_id: "x", lance_id: UUID2 }).success,
    false,
  );
});
