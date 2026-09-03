import { test } from "vitest";
import assert from "node:assert/strict";
import {
  validarImagem,
  validarConteudoImagem,
  validarImagemUpload,
  TAMANHO_MAXIMO_IMAGEM_BYTES,
} from "./validacao-imagem";

const arquivo = (bytes: number[], type = "image/jpeg") =>
  new File([new Uint8Array(bytes)], "foto.jpg", { type });
const JPEG = [0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0];
const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0];

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

test("validarConteudoImagem aceita bytes reais de JPEG e de PNG", async () => {
  assert.equal(await validarConteudoImagem(arquivo(JPEG)), null);
  assert.equal(await validarConteudoImagem(arquivo(PNG)), null);
});

test("validarConteudoImagem rejeita executável renomeado com header image/jpeg", async () => {
  const exe = arquivo([0x4d, 0x5a, 0x90, 0, 0, 0, 0, 0, 0, 0, 0, 0]); // 'MZ...'
  assert.match((await validarConteudoImagem(exe)) ?? "", /não é uma imagem válida/);
});

test("validarImagemUpload cruza MIME declarado e magic bytes", async () => {
  assert.equal(await validarImagemUpload(arquivo(JPEG, "image/jpeg")), null);
  // header diz jpeg, conteúdo é PDF
  const fake = arquivo([0x25, 0x50, 0x44, 0x46, 0x2d, 0, 0, 0, 0, 0, 0, 0], "image/jpeg");
  assert.ok(await validarImagemUpload(fake));
});
