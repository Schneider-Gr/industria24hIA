import assert from "node:assert/strict";
import { test } from "vitest";
import { buscarNoManual, normalizar } from "./busca-manual";
import { MANUAL_SELLER } from "@/components/seller/manual-seller";

// A busca decide se o seller acha a resposta sozinho ou vai incomodar o bot.
// Os casos abaixo são os que o seller digita de verdade, com acento e sem.

test("acha o tópico de repasse pelo nome", () => {
  const [primeiro] = buscarNoManual(MANUAL_SELLER, "repasse");
  assert.equal(primeiro?.topico.id, "repasse");
});

test("ignora acento na consulta e no conteúdo", () => {
  const comAcento = buscarNoManual(MANUAL_SELLER, "logística");
  const semAcento = buscarNoManual(MANUAL_SELLER, "logistica");
  assert.deepEqual(
    comAcento.map((r) => r.topico.id),
    semAcento.map((r) => r.topico.id),
  );
  assert.ok(comAcento.length > 0, "logística deveria achar o tópico do parceiro logístico");
});

test("acha conteúdo que só existe no corpo, não no título", () => {
  const ids = buscarNoManual(MANUAL_SELLER, "pix").map((r) => r.topico.id);
  assert.ok(ids.includes("repasse"), `pix deveria cair no repasse, veio: ${ids.join(", ")}`);
});

test("consulta vazia ou curta demais não devolve o manual inteiro", () => {
  assert.deepEqual(buscarNoManual(MANUAL_SELLER, ""), []);
  assert.deepEqual(buscarNoManual(MANUAL_SELLER, "  "), []);
  assert.deepEqual(buscarNoManual(MANUAL_SELLER, "de"), []);
});

test("termo que não existe no manual devolve nada, para o bot assumir", () => {
  assert.deepEqual(buscarNoManual(MANUAL_SELLER, "xilofone quantico"), []);
});

test("cada resultado traz um trecho para a lista", () => {
  for (const r of buscarNoManual(MANUAL_SELLER, "produto")) {
    assert.ok(r.trecho.length > 0, `${r.topico.id} veio sem trecho`);
    assert.ok(r.trecho.length <= 160, `${r.topico.id} veio com trecho longo demais`);
  }
});

test("normalizar tira acento e caixa", () => {
  assert.equal(normalizar("Comissão ATIVA"), "comissao ativa");
});
