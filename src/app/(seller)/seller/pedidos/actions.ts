"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// Fulfillment é gravado na tabela `entregas` (fonte única, 0009/0014), não mais
// na flag linha_itens.entregue — assim seller, admin e afiliado logístico veem
// o mesmo estado. RLS (entregas_seller_all) garante que só itens da loja do
// seller passam. Checkbox do seller mapeia para o status tri-estado da tabela.
export async function marcarEntrega(formData: FormData) {
  const itemId = formData.get("item_id");
  const entregue = formData.get("entregue") === "true";
  if (!itemId || typeof itemId !== "string") {
    throw new Error("Item inválido.");
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("entregas")
    .upsert(
      {
        linha_item_id: itemId,
        status: entregue ? "Entregue" : "Pendente",
        atualizado_em: new Date().toISOString(),
      },
      { onConflict: "linha_item_id" },
    )
    .select("linha_item_id");

  if (error) throw new Error(error.message);
  if (!data || data.length === 0) {
    throw new Error("Entrega não atualizada (item fora da sua loja?).");
  }
  revalidatePath("/seller/pedidos");
}
