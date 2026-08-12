"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/auth";

// Monta o lote de consolidação (RPC 0074, admin-only no banco): valida
// pedidos pagos/consolidados/mesma loja/mesmo corredor e publica UMA
// corrida-manifesto com preço = soma dos fretes cobrados. Gate explícito
// aqui é defesa em profundidade além do admin-only da RPC.
export async function criarLote(formData: FormData): Promise<void> {
  if (!(await isAdmin())) throw new Error("Acesso restrito a administradores.");

  const pedidoIds = formData.getAll("pedido_id").map(String).filter(Boolean);
  if (pedidoIds.length < 2) throw new Error("Selecione ao menos 2 pedidos.");

  const supabase = await createClient();
  const { error } = await supabase.rpc("criar_lote_consolidacao", {
    p_pedido_ids: pedidoIds,
  });
  if (error) throw new Error(error.message);

  revalidatePath("/admin/lotes");
}

// Desfaz o lote (RPC 0074): cancela a corrida (se não coletada), libera os
// pedidos para novo lote e marca o lote Cancelado.
export async function cancelarLote(formData: FormData): Promise<void> {
  if (!(await isAdmin())) throw new Error("Acesso restrito a administradores.");

  const loteId = String(formData.get("lote_id") ?? "");
  if (!loteId) throw new Error("Lote inválido.");

  const supabase = await createClient();
  const { error } = await supabase.rpc("cancelar_lote_consolidacao", {
    p_lote_id: loteId,
  });
  if (error) throw new Error(error.message);

  revalidatePath("/admin/lotes");
}
