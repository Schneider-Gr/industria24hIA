"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/auth";

// Estorno interno (RPC 0083): cancela o pedido e marca repasses pendentes
// como estornados. Não chama a Asaas — reversão financeira real continua
// manual, fora do sistema (decisão de escopo confirmada com o dono).
export async function estornarPedido(formData: FormData) {
  if (!(await isAdmin())) throw new Error("Acesso restrito a administradores.");

  const pedidoId = String(formData.get("pedido_id") ?? "");
  const motivo = String(formData.get("motivo") ?? "").trim();
  if (!pedidoId) throw new Error("Pedido inválido.");
  if (!motivo) throw new Error("Descreva o motivo do estorno.");

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_estornar_pedido", {
    p_pedido_id: pedidoId,
    p_motivo: motivo,
  });
  if (error) throw new Error(error.message);

  revalidatePath("/admin/pedidos");
}

export async function abrirDisputa(formData: FormData) {
  if (!(await isAdmin())) throw new Error("Acesso restrito a administradores.");

  const pedidoId = String(formData.get("pedido_id") ?? "");
  const motivo = String(formData.get("motivo") ?? "").trim();
  if (!pedidoId) throw new Error("Pedido inválido.");
  if (!motivo) throw new Error("Descreva o motivo da disputa.");

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_abrir_disputa", {
    p_pedido_id: pedidoId,
    p_motivo: motivo,
  });
  if (error) throw new Error(error.message);

  revalidatePath("/admin/pedidos");
}
