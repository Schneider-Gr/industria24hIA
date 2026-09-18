import { describe, expect, it } from "vitest";
import { menorPrecoVitrine } from "./vitrine-quick-flags";

describe("menorPrecoVitrine", () => {
  const hoje = "2026-09-18";
  it("escolhe o menor entre desconto e venda futura", () => {
    expect(menorPrecoVitrine(100, [{ min_qtd: 10, valor_unitario: 90 }], [85], hoje)).toBe(85);
    expect(menorPrecoVitrine(100, [{ min_qtd: 10, valor_unitario: 80 }], [85], hoje)).toBe(80);
  });
  it("ignora faixa vencida e preço que não é menor", () => {
    expect(menorPrecoVitrine(100, [{ min_qtd: 5, valor_unitario: 50, validade: "2026-09-17" }], [120], hoje)).toBeNull();
  });
});
