// Terceira trava do carrinho, ao lado das duas de compra mínima
// (`travas-minimas.ts`): o item ainda pode ser comprado?
//
// ponytail: réplica pura da regra que `checkout_criar_pedido` já aplica no
// banco (0140:151 para reserva, 0140:156 para saldo à vista). O banco continua
// sendo a autoridade — isto existe para o comprador não descobrir a ruptura só
// na tela de pagamento, como aconteceu em 16/09/2026.

export type SaldoProduto = {
  /** Saldo à vista (`produtos.estoque_atual`). */
  estoque: number;
  /** Soma das ofertas de venda futura com saldo (`vendas_futuras.estoque`). */
  reservaEstoque: number;
  /** Previsão mais próxima entre as ofertas com saldo. */
  reservaPrevisao: string | null;
};

export type EstadoDisponibilidade =
  /** Dá para comprar a quantidade pedida. */
  | "ok"
  /** Sem saldo à vista e sem reserva: o produto saiu da vitrine. */
  | "sem_estoque"
  /** Sem saldo à vista, mas há venda futura: comprável só como reserva. */
  | "so_reserva"
  /** Há saldo, mas menos do que o pedido. */
  | "acima_do_saldo";

export type Disponibilidade = {
  estado: EstadoDisponibilidade;
  disponivel: boolean;
  /** Quantidade máxima comprável pela via do próprio item. */
  maximo: number;
  /** Preenchida quando há reserva para oferecer. */
  previsaoReserva: string | null;
};

export function avaliarDisponibilidade(
  item: { quantidade: number; venda_futura_id?: string | null },
  saldo: SaldoProduto | undefined,
): Disponibilidade {
  // Produto que sumiu do catálogo (recusado, loja desativada, excluído) não
  // volta na consulta de saldo — trata como ruptura, nunca como liberado.
  if (!saldo) {
    return { estado: "sem_estoque", disponivel: false, maximo: 0, previsaoReserva: null };
  }

  // Item que já é reserva consome o saldo da venda futura, não o do produto.
  const maximo = item.venda_futura_id ? saldo.reservaEstoque : saldo.estoque;
  const previsaoReserva = saldo.reservaEstoque > 0 ? saldo.reservaPrevisao : null;

  if (maximo <= 0) {
    return {
      estado: item.venda_futura_id || saldo.reservaEstoque <= 0 ? "sem_estoque" : "so_reserva",
      disponivel: false,
      maximo: 0,
      previsaoReserva,
    };
  }

  if (item.quantidade > maximo) {
    return { estado: "acima_do_saldo", disponivel: false, maximo, previsaoReserva };
  }

  return { estado: "ok", disponivel: true, maximo, previsaoReserva };
}

export function mensagemDisponibilidade(d: Disponibilidade): string | null {
  switch (d.estado) {
    case "sem_estoque":
      return "Indisponível no momento — remova para continuar.";
    case "so_reserva":
      return d.previsaoReserva
        ? `Sem estoque imediato. Disponível como reserva com entrega prevista para ${formatarData(d.previsaoReserva)}.`
        : "Sem estoque imediato. Disponível como reserva.";
    case "acima_do_saldo":
      return `Só restam ${d.maximo} un — ajuste a quantidade para continuar.`;
    default:
      return null;
  }
}

function formatarData(iso: string): string {
  const [ano, mes, dia] = iso.split("-");
  return dia && mes && ano ? `${dia}/${mes}/${ano}` : iso;
}
