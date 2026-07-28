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

// Confirma retirada/entrega pelo código apresentado pelo comprador (0071).
// A RPC valida dono da loja, pedido pago e código; marca as linhas Entregue.
export async function confirmarEntregaCodigo(formData: FormData) {
  const pedidoId = formData.get("pedido_id");
  const codigo = String(formData.get("codigo") ?? "").trim();
  if (!pedidoId || typeof pedidoId !== "string" || !codigo) {
    throw new Error("Informe o código de retirada.");
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("pedido_confirmar_entrega", {
    p_pedido_id: pedidoId,
    p_codigo: codigo,
  });
  if (error) throw new Error(error.message);
  // -1 = código errado (0090 devolve em vez de lançar, pra não reverter o
  // contador de tentativas).
  if (data === -1) throw new Error("Código de retirada incorreto.");
  revalidatePath("/seller/pedidos");
}
