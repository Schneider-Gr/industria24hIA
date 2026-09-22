import { describe, expect, it } from "vitest";
import { lerHistorico, registrarTermo, sortirPorLoja } from "./vitrine-personalizacao";

describe("sortirPorLoja", () => {
  it("intercala lojas sem descartar item", () => {
    const itens = ["a1", "a2", "a3", "a4", "b1", "c1", "c2"].map((id) => ({ id, loja: id[0] }));
    expect(sortirPorLoja(itens, (i) => i.loja).map((i) => i.id)).toEqual(["a1", "b1", "c1", "a2", "c2", "a3", "a4"]);
  });
});

describe("histórico de busca", () => {
  it("põe o termo mais recente primeiro, sem duplicar, até 5", () => {
    let h: string[] = [];
    for (const t of ["alface", "cimento", "Alface", "a", "tinta", "tela", "polpa"]) h = registrarTermo(h, t);
    expect(h).toEqual(["polpa", "tela", "tinta", "Alface", "cimento"]);
  });
  it("lê cookie inválido como vazio", () => {
    expect(lerHistorico("%%%")).toEqual([]);
    expect(lerHistorico(encodeURIComponent(JSON.stringify(["x", 1])))).toEqual(["x"]);
  });
});
