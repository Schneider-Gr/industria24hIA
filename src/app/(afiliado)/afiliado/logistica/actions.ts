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
