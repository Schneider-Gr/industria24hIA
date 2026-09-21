import { describe, expect, it } from "vitest";
import { LIMIAR_CONFIANCA_PERSONA, personaDaResposta } from "./jevPersona";

describe("personaDaResposta", () => {
  it("aceita persona com confiança no limiar", () => {
    expect(personaDaResposta("seller", LIMIAR_CONFIANCA_PERSONA)).toBe("seller");
  });
  it("devolve null abaixo do limiar (fluxo antigo assume)", () => {
    expect(personaDaResposta("seller", LIMIAR_CONFIANCA_PERSONA - 0.01)).toBeNull();
  });
  it("devolve null para indefinido mesmo com confiança alta", () => {
    expect(personaDaResposta("indefinido", 0.99)).toBeNull();
  });
});
