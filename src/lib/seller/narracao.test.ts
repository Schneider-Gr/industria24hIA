import assert from "node:assert/strict";
import { test } from "vitest";
import { escolherVoz, podeNarrar } from "./narracao";

// A regra que importa: oferecer o botão de ouvir só quando existe voz em
// português. Um botão que fala inglês sobre um painel em português é pior que
// botão nenhum.

test("prefere pt-BR sobre pt-PT", () => {
  const voz = escolherVoz([
    { lang: "en-US", name: "Zira" },
    { lang: "pt-PT", name: "Joana" },
    { lang: "pt-BR", name: "Maria" },
  ]);
  assert.equal(voz?.name, "Maria");
});

test("cai em pt-PT quando não há pt-BR", () => {
  const voz = escolherVoz([
    { lang: "en-US", name: "Zira" },
    { lang: "pt-PT", name: "Joana" },
  ]);
  assert.equal(voz?.name, "Joana");
});

test("dentro do mesmo idioma prefere a voz padrão do sistema", () => {
  const voz = escolherVoz([
    { lang: "pt-BR", name: "Daniel" },
    { lang: "pt-BR", name: "Francisca", default: true },
  ]);
  assert.equal(voz?.name, "Francisca");
});

test("aceita o separador com underline que alguns sistemas devolvem", () => {
  const voz = escolherVoz([{ lang: "pt_BR", name: "Luciana" }]);
  assert.equal(voz?.name, "Luciana");
});

test("sem voz em português não há narração", () => {
  assert.equal(escolherVoz([{ lang: "en-US", name: "Zira" }]), null);
  assert.equal(podeNarrar([{ lang: "en-US", name: "Zira" }]), false);
  assert.equal(podeNarrar([]), false);
  assert.equal(podeNarrar(undefined), false);
  assert.equal(podeNarrar([{ lang: "pt-BR", name: "Maria" }]), true);
});
