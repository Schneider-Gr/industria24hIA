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

// Pipeline pós-pagamento (0108): Pagamento Realizado -> Em Separação -> Enviado.
// A RPC valida dono da loja e que a transição não pula etapa.
export async function avancarStatusPedido(formData: FormData) {
  const pedidoId = formData.get("pedido_id");
  const novoStatus = formData.get("novo_status");
  if (!pedidoId || typeof pedidoId !== "string" || typeof novoStatus !== "string") {
    throw new Error("Pedido inválido.");
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("pedido_avancar_status", {
    p_pedido_id: pedidoId,
    p_novo_status: novoStatus,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/seller/pedidos");
}

// Cancelamento (0108): admin ou seller dono da loja, a partir de qualquer
// status anterior a "Enviado". Repõe estoque; estorno financeiro via Asaas
// fica fora de escopo (mesma decisão de 0084).
export async function cancelarPedido(formData: FormData) {
  const pedidoId = formData.get("pedido_id");
  const motivo = String(formData.get("motivo") ?? "").trim();
  if (!pedidoId || typeof pedidoId !== "string" || !motivo) {
    throw new Error("Descreva o motivo do cancelamento.");
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("pedido_cancelar", {
    p_pedido_id: pedidoId,
    p_motivo: motivo,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/seller/pedidos");
}
