import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { ErrorState } from "@/components/ErrorState";
import { PageHeader, Table, EmptyState } from "@/components/admin/ui";
import { hojeManaus, diasDeAtraso, formatarDataBR } from "@/lib/venda-futura/avisos";

export const dynamic = "force-dynamic";

// Fila de vendas futuras vencidas (PRD 047, US03). Antes disso a data vencia
// em silêncio: o item ficava pendente para sempre e ninguém era cobrado.
// Só leitura: a decisão de cada caso (renegociar, cancelar) é humana, e o
// estorno ficou deliberadamente fora do escopo — não existe devolução de
// pagamento no sistema.
export default async function VendaFuturaAtrasadaPage() {
  if (!isSupabaseConfigured) {
    return (
      <ErrorState
        title="Supabase não configurado"
        detail="Defina as variáveis do Supabase em web/.env.local."
      />
    );
  }

  const supabase = await createClient();
  const hoje = hojeManaus();

  const { data: itens, error } = await supabase
    .from("linha_itens")
    .select("id, pedido_id, produto_nome, quantidade, venda_futura_id, entregue")
    .not("venda_futura_id", "is", null)
    .eq("entregue", false);

  if (error) {
    return <ErrorState title="Falha ao carregar as reservas" detail={error.message} />;
  }

  const pendentes = itens ?? [];
  const idsOferta = [...new Set(pendentes.map((i) => i.venda_futura_id as string))];

  const [{ data: ofertas }, { data: pedidos }] = await Promise.all([
    idsOferta.length
      ? supabase.from("vendas_futuras").select("id, previsao").in("id", idsOferta)
      : Promise.resolve({ data: [] as { id: string; previsao: string | null }[] }),
    pendentes.length
      ? supabase
          .from("pedidos")
          .select("id, id_venda, loja_id, status_pedido")
          .in("id", pendentes.map((i) => i.pedido_id))
      : Promise.resolve({ data: [] as { id: string; id_venda: string | null; loja_id: string; status_pedido: string }[] }),
  ]);

  const previsaoPorOferta = new Map((ofertas ?? []).map((o) => [o.id, o.previsao]));
  const pedidoPorId = new Map((pedidos ?? []).map((p) => [p.id, p]));

  const { data: lojas } = (pedidos ?? []).length
    ? await supabase
        .from("lojas")
        .select("id, nome")
        .in("id", [...new Set((pedidos ?? []).map((p) => p.loja_id))])
    : { data: [] as { id: string; nome: string | null }[] };
  const nomeLoja = (id: string) => (lojas ?? []).find((l) => l.id === id)?.nome ?? "—";

  const atrasados = pendentes
    .flatMap((item) => {
      const pedido = pedidoPorId.get(item.pedido_id);
      // Pedido cancelado não é atraso: não há o que cobrar.
      if (!pedido || pedido.status_pedido === "Cancelado") return [];
      const previsao = previsaoPorOferta.get(item.venda_futura_id as string);
      if (!previsao || previsao >= hoje) return [];
      return [{ item, pedido, previsao, dias: diasDeAtraso(previsao, hoje) }];
    })
    .sort((a, b) => b.dias - a.dias);

  return (
    <div>
      <PageHeader
        title="Vendas futuras atrasadas"
        subtitle="Reservas que passaram da data combinada e ainda não foram entregues"
      />

      <div className="px-4">
        {atrasados.length === 0 ? (
          <EmptyState>Nenhuma venda futura em atraso.</EmptyState>
        ) : (
          <Table headers={["Pedido", "Produto", "Qtd", "Loja", "Previsão", "Atraso"]}>
            {atrasados.map(({ item, pedido, previsao, dias }) => (
              <tr key={item.id} className="text-ink dark:text-ink-2">
                <td className="px-4 py-3 text-sm">{pedido.id_venda ?? pedido.id.slice(0, 8)}</td>
                <td className="px-4 py-3 text-sm">{item.produto_nome ?? "—"}</td>
                <td className="px-4 py-3 text-right text-sm">{item.quantidade ?? 1}</td>
                <td className="px-4 py-3 text-sm">{nomeLoja(pedido.loja_id)}</td>
                <td className="px-4 py-3 text-sm">{formatarDataBR(previsao)}</td>
                <td className="px-4 py-3 text-sm font-semibold text-error dark:text-error-light">
                  {dias} {dias === 1 ? "dia" : "dias"}
                </td>
              </tr>
            ))}
          </Table>
        )}
      </div>
    </div>
  );
}
