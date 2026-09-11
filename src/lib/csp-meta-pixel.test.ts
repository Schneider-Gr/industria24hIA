import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { exigeCspEstrita } from "@/lib/gate-rotas";
import { META_PIXEL_ID } from "@/components/MetaPixel";

// O pixel da Meta falha em silêncio quando o CSP bloqueia: nenhum erro de
// build, nenhum erro de runtime visível, só evento que nunca chega ao
// Gerenciador de Eventos. Estas asserções são a rede contra isso — lêem o
// proxy.ts como texto porque cspParaRota não é exportada.
const proxy = readFileSync(
  fileURLToPath(new URL("../proxy.ts", import.meta.url)),
  "utf-8"
);

describe("CSP do pixel da Meta", () => {
  it("libera connect.facebook.net em script-src na variante pública", () => {
    const linha = proxy
      .split("\n")
      .find((l) => l.includes("script-src 'self' 'unsafe-inline'"));
    expect(linha).toBeDefined();
    expect(linha).toContain("https://connect.facebook.net");
  });

  it("libera www.facebook.com em img-src e connect-src", () => {
    expect(proxy).toMatch(/"img-src[^"]*https:\/\/www\.facebook\.com/);
    expect(proxy).toMatch(/"connect-src[^"]*https:\/\/www\.facebook\.com/);
  });

  it("mantém a landing fora da CSP estrita, que barraria o script inline", () => {
    expect(exigeCspEstrita("/venda-no-industria")).toBe(false);
  });

  it("usa o id do conjunto de dados industria24h-web", () => {
    expect(META_PIXEL_ID).toBe("2023211978366883");
  });
});
