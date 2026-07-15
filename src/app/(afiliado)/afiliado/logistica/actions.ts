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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- RPC 0042 fora dos tipos gerados
  const { error } = await (supabase as any).rpc("atualizar_status_rota", {
    p_rota_id: String(formData.get("rota_id")),
    p_status: String(formData.get("status")),
  });
  if (error) throw new Error(error.message);
  revalidatePath("/afiliado/logistica");
}

export async function revisarCorridaAfiliado(formData: FormData) {
  const supabase = await createClient();
  const janelaInicio = String(formData.get("janela_inicio"));
  const janelaFim = String(formData.get("janela_fim"));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- RPC 0051 fora dos tipos gerados
  const { error } = await (supabase as any).rpc("revisar_corrida_afiliado", {
    p_corrida_id: String(formData.get("corrida_id")),
    p_peso_kg: Number(formData.get("peso_kg")),
    p_volume_m3: formData.get("volume_m3") ? Number(formData.get("volume_m3")) : null,
    p_janela_inicio: new Date(janelaInicio).toISOString(),
    p_janela_fim: new Date(janelaFim).toISOString(),
    p_descricao_carga: String(formData.get("descricao_carga") ?? ""),
  });
  if (error) throw new Error(error.message);
  revalidatePath("/afiliado/logistica");
}

export async function aceitarCorridaAfiliado(formData: FormData) {
  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- RPC 0043 fora dos tipos gerados
  const { error } = await (supabase as any).rpc("aceitar_corrida", {
    p_corrida_id: String(formData.get("corrida_id")),
  });
  if (error) throw new Error(error.message);
  revalidatePath("/afiliado/logistica");
}

export async function atualizarStatusCorridaAfiliado(formData: FormData) {
  const corridaId = String(formData.get("corrida_id"));
  const status = String(formData.get("status"));
  const supabase = await createClient();

  let fotoUrl: string | null = null;
  const foto = formData.get("foto");
  if (foto instanceof File && foto.size > 0) {
    const path = `${corridaId}/${Date.now()}-${foto.name.replace(/[^\w.-]/g, "_")}`;
    const { error: upErr } = await supabase.storage.from("entregas").upload(path, foto);
    if (upErr) throw new Error(`Falha no upload da foto: ${upErr.message}`);
    fotoUrl = supabase.storage.from("entregas").getPublicUrl(path).data.publicUrl;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- RPC 0045 fora dos tipos gerados
  const { error } = await (supabase as any).rpc("atualizar_status_corrida", {
    p_corrida_id: corridaId,
    p_status: status,
    p_foto_url: fotoUrl,
    p_assinatura_url: null,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/afiliado/logistica");
}
