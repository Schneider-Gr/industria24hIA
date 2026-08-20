"use server";

import * as Sentry from "@sentry/nextjs";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { dispararRepasseAutomatico } from "@/lib/repasses";
import { avisarSaiuParaEntrega } from "@/lib/avisos-pedido";

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
  const rotaId = String(formData.get("rota_id"));
  const status = String(formData.get("status"));
  const { error } = await supabase.rpc("atualizar_status_rota", {
    p_rota_id: rotaId,
    p_status: status,
  });
  if (error) throw new Error(error.message);

  if (status === "EmTransito") {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- rotas fora de database.types.ts nesta consulta pontual
    const svc = createServiceClient() as any;
    const { data: rota } = await svc.from("rotas").select("pedido_id").eq("id", rotaId).maybeSingle();
    if (rota?.pedido_id) {
      await avisarSaiuParaEntrega(rota.pedido_id);
    }
  }

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

// Corrida nasceu com produto marcado parceiro_logistico_habilitado (0095):
// afiliado exclusivo revisa peso/volume/janela/descrição antes de poder
// aceitar. Sai do estado de revisão só depois deste RPC.
export async function revisarCorridaAfiliado(formData: FormData) {
  const pesoKg = Number(formData.get("peso_kg"));
  const volumeM3Raw = String(formData.get("volume_m3") ?? "").trim();
  const janelaInicio = String(formData.get("janela_inicio") ?? "");
  const janelaFim = String(formData.get("janela_fim") ?? "");
  const descricao = String(formData.get("descricao_carga") ?? "").trim();

  const supabase = await createClient();
  // 0095: RPC fora de database.types.ts até a migration ser aplicada e os
  // tipos regenerados (supabase generate-types).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- RPC 0095 fora dos tipos gerados
  const { error } = await (supabase as any).rpc("revisar_corrida_afiliado", {
    p_corrida_id: String(formData.get("corrida_id")),
    p_peso_kg: pesoKg,
    p_volume_m3: volumeM3Raw ? Number(volumeM3Raw) : null,
    p_janela_inicio: janelaInicio ? new Date(janelaInicio).toISOString() : null,
    p_janela_fim: janelaFim ? new Date(janelaFim).toISOString() : null,
    p_descricao_carga: descricao || null,
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
    // Token correto libera o repasse ao seller (migration 0111). Best-effort:
    // uma falha na transferência não pode desfazer a confirmação de entrega.
    if (cod !== 0) {
      try {
        await dispararRepasseAutomatico(pedidoId);
      } catch (erro) {
        Sentry.captureException(erro, {
          tags: { area: "repasses", signal: "disparo_pos_entrega" },
          extra: { pedidoId },
        });
      }
    }
  }

  const { error } = await supabase.rpc("atualizar_status_corrida", {
    p_corrida_id: corridaId,
    p_status: status,
    p_foto_url: fotoUrl ?? undefined,
    p_assinatura_url: undefined,
  });
  if (error) throw new Error(error.message);

  if (status === "EmTransito" && pedidoId) {
    await avisarSaiuParaEntrega(pedidoId);
  }

  revalidatePath("/afiliado/logistica");
}
