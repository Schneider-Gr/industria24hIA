"use server";

import * as Sentry from "@sentry/nextjs";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getUser } from "@/lib/auth";
import { dispararRepasseAutomatico } from "@/lib/repasses";
import { avisarSaiuParaEntrega } from "@/lib/avisos-pedido";

// Tabelas/RPCs da migration 0039/0040 ainda fora dos tipos gerados — o cast
// justificado fica concentrado nestes helpers.
async function db() {
  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return supabase as any;
}

const TERMOS_SLUG = "termos-parceiro-logistico";

// Carimba a versão aceita = atualizado_em da página CMS vigente (0063). Se a
// página não existir (seed não aplicado), grava o instante do aceite como
// fallback, para nunca deixar o campo vazio quando o aceite de fato ocorreu.
// Mesmo padrão de `versaoTermosVigente` em (afiliado)/afiliado/actions.ts.
async function versaoTermosVigente(): Promise<string> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("paginas_cms")
    .select("atualizado_em")
    .eq("slug", TERMOS_SLUG)
    .maybeSingle();
  return data?.atualizado_em ?? new Date().toISOString();
}

export async function salvarCadastroParceiro(formData: FormData) {
  const user = await getUser();
  if (!user) throw new Error("Faça login.");

  const supabaseAceite = await db();
  const { data: existente } = await supabaseAceite
    .from("parceiros_logisticos")
    .select("termos_aceitos_em")
    .eq("user_id", user.id)
    .maybeSingle();

  // Só exige o aceite de quem ainda não aceitou: edições posteriores do cadastro
  // preservam o carimbo original em vez de reescrevê-lo com a data de hoje.
  const jaAceitou = Boolean(existente?.termos_aceitos_em);
  if (!jaAceitou && !formData.get("aceite_termos")) {
    throw new Error("É necessário aceitar os Termos do Parceiro Logístico.");
  }

  const aceite = jaAceitou
    ? {}
    : {
        termos_aceitos_em: new Date().toISOString(),
        termos_versao: await versaoTermosVigente(),
      };

  const campos = {
    user_id: user.id,
    tipo: String(formData.get("tipo") ?? "motorista"),
    nome: String(formData.get("nome") ?? "").trim(),
    telefone: String(formData.get("telefone") ?? "").trim() || null,
    cnh: String(formData.get("cnh") ?? "").trim() || null,
    doc_veiculo: String(formData.get("doc_veiculo") ?? "").trim() || null,
    placa: String(formData.get("placa") ?? "").trim() || null,
    capacidade_kg: Number(formData.get("capacidade_kg")) || null,
    capacidade_m3: Number(formData.get("capacidade_m3")) || null,
    area_atuacao: String(formData.get("area_atuacao") ?? "").trim() || null,
    cep_base: String(formData.get("cep_base") ?? "").trim() || null,
    valor_minimo_entrega: Number(formData.get("valor_minimo_entrega")) || null,
    ...aceite,
  };
  if (!campos.nome) throw new Error("Informe o nome.");
  if (!["motorista", "transportadora"].includes(campos.tipo)) throw new Error("Tipo inválido.");

  const supabase = await db();
  const { error } = await supabase
    .from("parceiros_logisticos")
    .upsert(campos, { onConflict: "user_id" });
  if (error) throw new Error(`Não foi possível salvar o cadastro: ${error.message}`);
  revalidatePath("/parceiro");
}

export async function aceitarCorrida(formData: FormData) {
  const supabase = await db();
  const { error } = await supabase.rpc("aceitar_corrida", {
    p_corrida_id: String(formData.get("corrida_id")),
  });
  if (error) throw new Error(error.message);
  revalidatePath("/parceiro");
}

export async function darLanceCorrida(formData: FormData) {
  const supabase = await db();
  const { error } = await supabase.rpc("dar_lance_corrida", {
    p_corrida_id: String(formData.get("corrida_id")),
    p_valor: Number(formData.get("valor")),
    p_prazo: String(formData.get("prazo") ?? "").trim() || null,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/parceiro");
}

export async function atualizarStatusCorrida(formData: FormData) {
  const user = await getUser();
  if (!user) throw new Error("Faça login.");
  const corridaId = String(formData.get("corrida_id"));
  const status = String(formData.get("status"));
  const pedidoId = String(formData.get("pedido_id") ?? "").trim();
  const codigo = String(formData.get("codigo") ?? "").trim();
  const supabase = await db();

  let fotoUrl: string | null = null;
  const foto = formData.get("foto");
  if (foto instanceof File && foto.size > 0) {
    const path = `${corridaId}/${Date.now()}-${foto.name.replace(/[^\w.-]/g, "_")}`;
    const { error: upErr } = await supabase.storage.from("entregas").upload(path, foto);
    if (upErr) throw new Error(`Falha no upload da foto: ${upErr.message}`);
    fotoUrl = supabase.storage.from("entregas").getPublicUrl(path).data.publicUrl;
  }

  // PRD 001: código do comprador fecha o fulfillment em `entregas`. Vem antes
  // de mover a corrida — código errado não pode deixar a corrida num estado
  // que o entregador não consegue desfazer.
  if (status === "Entregue" && pedidoId) {
    const { data: cod, error: codErr } = await supabase.rpc("pedido_confirmar_entrega", {
      p_pedido_id: pedidoId,
      p_codigo: codigo,
    });
    if (codErr) throw new Error(codErr.message);
    if (cod === -1) throw new Error("Código do comprador incorreto.");
    // Token correto libera o repasse ao seller (migration 0111). Best-effort:
    // uma falha na transferência não pode desfazer a confirmação de entrega
    // já gravada — ela vira 'falhou' no ledger de /admin/repasses.
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
    p_foto_url: fotoUrl,
    p_assinatura_url: null,
  });
  if (error) throw new Error(error.message);

  if (status === "EmTransito" && pedidoId) {
    await avisarSaiuParaEntrega(pedidoId);
  }

  revalidatePath("/parceiro");
}

export async function atualizarStatusRota(formData: FormData) {
  const supabase = await db();
  const rotaId = String(formData.get("rota_id"));
  const status = String(formData.get("status"));
  const { error } = await supabase.rpc("atualizar_status_rota", {
    p_rota_id: rotaId,
    p_status: status,
  });
  if (error) throw new Error(error.message);

  if (status === "EmTransito") {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const svc = createServiceClient() as any;
    const { data: rota } = await svc.from("rotas").select("pedido_id").eq("id", rotaId).maybeSingle();
    if (rota?.pedido_id) {
      await avisarSaiuParaEntrega(rota.pedido_id);
    }
  }

  revalidatePath("/parceiro");
}

export async function alterarChavePixParceiro(formData: FormData) {
  const supabase = await db();
  const { error } = await supabase.rpc("alterar_chave_pix_parceiro", {
    p_chave_pix: String(formData.get("chave_pix") ?? "").trim(),
    p_tipo_chave_pix: String(formData.get("tipo_chave_pix") ?? ""),
  });
  if (error) throw new Error(error.message);
  revalidatePath("/parceiro/cadastro");
}
