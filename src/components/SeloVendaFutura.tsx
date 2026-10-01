import { IconeVendaFutura } from "@/components/vitrine/icones-menu";

// Selo de pedido com item de venda futura (change venda-futura-custodia-e-avisos):
// mesmo ícone do menu da vitrine, no roxo da seção Mercado Futuro, para o pedido
// de reserva se destacar nas listas do seller, do comprador e do admin.
export function SeloVendaFutura({ data }: { data?: string | null }) {
  return (
    <span
      className="inline-flex shrink-0 items-center gap-1 rounded-sm bg-vf-roxo/10 px-1.5 py-0.5 text-[11px] font-semibold text-vf-roxo"
      title="Pedido com reserva de venda futura: o pagamento fica retido até a entrega com código"
    >
      <IconeVendaFutura className="size-3.5" />
      Venda futura{data ? ` · ${data}` : ""}
    </span>
  );
}
