import type { SupabaseClient } from "@supabase/supabase-js";

export type CorridaDoPedido = {
  id: string;
  status: string;
  destino: string;
};

/** Corrida que entrega o pedido: vinculada direto (`corridas.pedido_id`) ou via
 *  lote consolidado (0074). Exige client de SERVIÇO, porque o comprador não lê
 *  `corridas` pela própria RLS. Quem chama tem de ter provado antes que o pedido
 *  é do usuário (ex.: lendo pela view escopada `pedidos_cliente`). */
export async function corridaDoPedido(svc: SupabaseClient, pedidoId: string): Promise<CorridaDoPedido | null> {
  const campos = "id, status, destino_endereco, destino_cep";
  type Linha = { id: string; status: string; destino_endereco: string | null; destino_cep: string | null };

  let { data: c } = await svc
    .from("corridas")
    .select(campos)
    .eq("pedido_id", pedidoId)
    .neq("status", "Cancelada")
    .order("criado_em", { ascending: false })
    .limit(1)
    .maybeSingle<Linha>();

  if (!c) {
    const { data: lp } = await svc
      .from("lote_pedidos")
      .select("lotes_consolidacao(corrida_id)")
      .eq("pedido_id", pedidoId)
      .maybeSingle<{ lotes_consolidacao: { corrida_id: string | null } | null }>();
    const corridaId = lp?.lotes_consolidacao?.corrida_id;
    if (corridaId) {
      ({ data: c } = await svc.from("corridas").select(campos).eq("id", corridaId).maybeSingle<Linha>());
    }
  }
  if (!c) return null;
  return {
    id: c.id,
    status: c.status,
    destino: [c.destino_endereco, c.destino_cep].filter(Boolean).join(", "),
  };
}
