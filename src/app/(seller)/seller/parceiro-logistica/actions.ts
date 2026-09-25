"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { calcularTrajeto } from "@/lib/geo";
import { PISO_KM_PADRAO, precoPorKm } from "@/lib/logistica-parceiro/preco-km";

export async function decidirParceria(formData: FormData) {
  const id = formData.get("id");
  const status = formData.get("status");
  if (typeof id !== "string" || (status !== "Aprovada" && status !== "Recusada")) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("parcerias_representante").update({ status }).eq("id", id);
  revalidatePath("/seller/parceiro-logistica");
}

export type SimulacaoKmState =
  | { ok: false; erro?: string }
  | { ok: true; km: number; minutos: number; preco: number; link: string };

const ERRO_GEO: Record<string, string> = {
  nao_configurado: "Integração com o Google Maps pendente (sem chave no servidor).",
  sem_rota: "O Google não encontrou rota entre os dois endereços.",
  teto_de_custo: "Limite diário de consultas ao Google Maps atingido. Tente amanhã.",
  provedor_indisponivel: "Google Maps indisponível agora. Tente de novo em instantes.",
};

// Simula o preço de uma entrega por km rodado. Exige login: cada chamada
// custa uma consulta paga na Routes API.
export async function simularKm(_prev: SimulacaoKmState, formData: FormData): Promise<SimulacaoKmState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, erro: "Faça login para simular." };

  const origem = String(formData.get("origem") ?? "").trim();
  const destino = String(formData.get("destino") ?? "").trim();
  const valorKm = Number(formData.get("valor_km"));
  if (!origem || !destino) return { ok: false, erro: "Informe origem e destino (CEP ou endereço)." };
  if (!(valorKm >= PISO_KM_PADRAO)) {
    return { ok: false, erro: `O valor por km não pode ficar abaixo do piso de R$ ${PISO_KM_PADRAO.toFixed(2).replace(".", ",")}.` };
  }

  const r = await calcularTrajeto(origem, destino);
  if (!r.ok) return { ok: false, erro: ERRO_GEO[r.erro] };

  const p = precoPorKm({ distanciaM: r.valor.distancia_m, valorKm });
  if (!p.ok) return { ok: false, erro: "Valor por km abaixo do piso." };
  return { ok: true, km: p.kmCobrados, minutos: Math.round(r.valor.duracao_s / 60), preco: p.preco, link: r.valor.link_mapa };
}
