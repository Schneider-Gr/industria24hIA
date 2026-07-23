"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// Monta o lote de consolidação (RPC 0074, admin-only no banco): valida
// pedidos pagos/consolidados/mesma loja/mesmo corredor e publica UMA
// corrida-manifesto com preço = soma dos fretes cobrados.
export async function criarLote(formData: FormData): Promise<void> {
  const pedidoIds = formData.getAll("pedido_id").map(String).filter(Boolean);
  if (pedidoIds.length < 2) throw new Error("Selecione ao menos 2 pedidos.");

  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- RPC 0074 fora dos tipos gerados
  const { error } = await (supabase as any).rpc("criar_lote_consolidacao", {
    p_pedido_ids: pedidoIds,
  });
  if (error) throw new Error(error.message);

  revalidatePath("/admin/lotes");
}
