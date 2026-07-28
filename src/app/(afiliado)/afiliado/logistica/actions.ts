"use server";

import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";

const STATUS_VALIDOS = ["Pendente", "Enviado", "Entregue"] as const;
type StatusEntrega = (typeof STATUS_VALIDOS)[number];

export async function atualizarEntregaLogistica(formData: FormData) {
  const user = await getUser();
  if (!user) throw new Error("Não autenticado.");

  const linha_item_id = String(formData.get("linha_item_id") ?? "");
  const statusRaw = String(formData.get("status") ?? "");
  const rastreioRaw = String(formData.get("rastreio") ?? "").trim();

  if (!linha_item_id) {
    throw new Error("Item de entrega inválido.");
  }

  if (!STATUS_VALIDOS.includes(statusRaw as StatusEntrega)) {
    throw new Error("Status inválido.");
  }
  const status = statusRaw as StatusEntrega;
  const rastreio = rastreioRaw === "" ? null : rastreioRaw;

  const supabase = await createClient();

  const { error } = await supabase
    .from("entregas")
    .upsert(
      {
        linha_item_id,
        status,
        rastreio,
        atualizado_em: new Date().toISOString(),
      },
      { onConflict: "linha_item_id" }
    );

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/afiliado/logistica");
}

export async function atualizarStatusRotaAfiliado(formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("atualizar_status_rota", {
    p_rota_id: String(formData.get("rota_id")),
    p_status: String(formData.get("status")),
  });
  if (error) throw new Error(error.message);
  revalidatePath("/afiliado/logistica");
}

export async function aceitarCorridaAfiliado(formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("aceitar_corrida", {
    p_corrida_id: String(formData.get("corrida_id")),
  });
  if (error) throw new Error(error.message);
  revalidatePath("/afiliado/logistica");
}

export async function atualizarStatusCorridaAfiliado(formData: FormData) {
  const corridaId = String(formData.get("corrida_id"));
  const status = String(formData.get("status"));
  const pedidoId = String(formData.get("pedido_id") ?? "").trim();
  const codigo = String(formData.get("codigo") ?? "").trim();
  const supabase = await createClient();

  let fotoUrl: string | null = null;
  const foto = formData.get("foto");
  if (foto instanceof File && foto.size > 0) {
    const path = `${corridaId}/${Date.now()}-${foto.name.replace(/[^\w.-]/g, "_")}`;
    const { error: upErr } = await supabase.storage.from("entregas").upload(path, foto);
    if (upErr) throw new Error(`Falha no upload da foto: ${upErr.message}`);
    fotoUrl = supabase.storage.from("entregas").getPublicUrl(path).data.publicUrl;
  }

  // PRD 001: na entrega de corrida com pedido, o código do comprador fecha o
  // fulfillment em `entregas` — sem ele o pedido seguia pendente pro comprador
  // mesmo com a corrida Entregue. Vem antes de mover a corrida: código errado
  // não pode deixar a corrida num estado que o entregador não consegue desfazer.
  if (status === "Entregue" && pedidoId) {
    const { data: cod, error: codErr } = await supabase.rpc("pedido_confirmar_entrega", {
      p_pedido_id: pedidoId,
      p_codigo: codigo,
    });
    if (codErr) throw new Error(codErr.message);
    if (cod === -1) throw new Error("Código do comprador incorreto.");
  }

  const { error } = await supabase.rpc("atualizar_status_corrida", {
    p_corrida_id: corridaId,
    p_status: status,
    p_foto_url: fotoUrl ?? undefined,
    p_assinatura_url: undefined,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/afiliado/logistica");
}
