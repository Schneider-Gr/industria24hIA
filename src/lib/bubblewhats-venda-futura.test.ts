import { describe, expect, it } from "vitest";
import { mensagemVendaFuturaCompradorConfirmada, mensagemVendaFuturaSellerConfirmada } from "./bubblewhats";

const itens = [{ produto: "Polpa de Açaí 1 kg", quantidade: 10, previsao: "01/11/2026" }];

describe("avisos de reserva confirmada", () => {
  it("comprador recebe data, código e aviso de retenção", () => {
    const m = mensagemVendaFuturaCompradorConfirmada({ idVenda: "ABC", itens, codigo: "1234", linkPedido: "x" });
    expect(m).toContain("10x Polpa de Açaí 1 kg, previsto para 01/11/2026");
    expect(m).toContain("*1234*");
    expect(m).toContain("retido");
  });

  it("comprador sem código não mostra linha de código", () => {
    expect(mensagemVendaFuturaCompradorConfirmada({ idVenda: "ABC", itens, codigo: null, linkPedido: "x" })).not.toContain("Código");
  });

  it("seller não recebe o código e sabe que o repasse depende dele", () => {
    const m = mensagemVendaFuturaSellerConfirmada({ idVenda: "ABC", itens, valor: "R$ 169.00" });
    expect(m).not.toContain("1234");
    expect(m).toContain("repasse sai depois");
  });
});
