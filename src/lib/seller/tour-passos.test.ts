import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { test } from "vitest";
import { PASSOS } from "./tour-passos";

// A narração é gravada na voz da dona e mora em `public/tour/`. Renomear um
// passo ou esquecer de gerar o áudio de um passo novo deixaria o botão "Ouvir"
// tentando tocar um arquivo que não existe — o seller clicaria no nada.

test("todo passo do tour tem o MP3 da narração publicado", () => {
  const faltando = PASSOS.filter((p) => !existsSync(`public/tour/${p.audio}.mp3`)).map(
    (p) => `${p.titulo} → public/tour/${p.audio}.mp3`,
  );

  assert.deepEqual(faltando, [], `narração ausente: ${faltando.join(", ")}`);
});

test("cada passo tem um áudio próprio", () => {
  const audios = PASSOS.map((p) => p.audio);
  assert.equal(new Set(audios).size, audios.length, "dois passos apontam para a mesma narração");
});
