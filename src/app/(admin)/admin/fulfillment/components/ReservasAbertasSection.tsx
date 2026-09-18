"use client";

import { Table, EmptyState } from "@/components/admin/ui";

interface Reserva {
  id: string;
  pedido_id: string;
  produto_id: string;
  quantidade: number;
  status: string;
}

export function ReservasAbertasSection({ reservas }: { reservas: Reserva[] }) {
  if (reservas.length === 0) {
    return <EmptyState>Nenhuma reserva aberta no CD.</EmptyState>;
  }

  return (
    <Table headers={["Pedido", "Produto ID", "Quantidade", "Status"]}>
      {reservas.map((res) => (
        <tr key={res.id} className="text-ink dark:text-ink-2">
          <td className="px-4 py-3 font-mono text-sm">{res.pedido_id}</td>
          <td className="px-4 py-3 font-mono text-xs">{res.produto_id.slice(0, 8)}…</td>
          <td className="px-4 py-3 text-right font-semibold">{res.quantidade}</td>
          <td className="px-4 py-3 text-xs capitalize">{res.status}</td>
        </tr>
      ))}
    </Table>
  );
}
