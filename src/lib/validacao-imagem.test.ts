import { test } from "vitest";
import assert from "node:assert/strict";
import { validarImagem, TAMANHO_MAXIMO_IMAGEM_BYTES } from "./validacao-imagem";

test("validarImagem aceita JPG dentro do limite de tamanho", () => {
  const erro = validarImagem({ size: 1024, type: "image/jpeg" });
  assert.equal(erro, null);
});

test("validarImagem rejeita arquivo maior que 5MB", () => {
  const erro = validarImagem({ size: TAMANHO_MAXIMO_IMAGEM_BYTES + 1, type: "image/png" });
  assert.match(erro ?? "", /5MB/);
});

test("validarImagem rejeita MIME type fora da lista permitida", () => {
  const erro = validarImagem({ size: 1024, type: "application/pdf" });
  assert.match(erro ?? "", /Formato de imagem não suportado/);
});

test("validarImagem rejeita um PDF renomeado com extensão de imagem mas MIME real de pdf", () => {
  const erro = validarImagem({ size: 1024, type: "application/pdf" });
  assert.ok(erro);
});
