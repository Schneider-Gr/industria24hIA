"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function marcarEntrega(formData: FormData) {
  const itemId = formData.get("item_id");
  const entregue = formData.get("entregue");

  if (!itemId || typeof itemId !== "string") {
    return;
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("linha_itens")
    .update({ entregue: entregue === "true" })
    .eq("id", itemId);

  if (error) {
    console.error("Erro ao atualizar entrega do item:", error.message);
    return;
  }

  revalidatePath("/seller/pedidos");
}
