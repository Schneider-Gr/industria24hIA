"use server";

import { revalidatePath } from "next/cache";
import { isAdmin } from "@/lib/auth";
import { isStatusEntrega, registrarStatusEntrega } from "@/lib/entregas";

// Atualiza o estado de fulfillment de um item. Escrita só admin (RLS); gate
// explícito aqui é defesa em profundidade.
export async function atualizarEntrega(formData: FormData) {
  if (!(await isAdmin())) throw new Error("Acesso restrito a administradores.");

  const linha_item_id = String(formData.get("linha_item_id") ?? "");
  const status = String(formData.get("status") ?? "").trim();
  const rastreio = String(formData.get("rastreio") ?? "").trim() || null;
  if (!linha_item_id || !status) throw new Error("Parâmetros inválidos.");
  if (!isStatusEntrega(status)) throw new Error("Status inválido.");

  await registrarStatusEntrega(linha_item_id, status, rastreio);
  revalidatePath("/admin/entregas");
}
