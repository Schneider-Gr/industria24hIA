"use server";

// Entrega por km do afiliado logístico (PRD 053): botão avião de cada produto
// (US01) com simulador. O piso vem da loja (US05) e o trigger da 0193 também
// barra valor abaixo dele, então esta validação é só para a mensagem amigável.

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getMinhaLoja } from "@/lib/auth";
import { calcularTrajeto, embedTrajeto } from "@/lib/geo";
import { precoPorKm } from "@/lib/logistica-parceiro/preco-km";

const reais = (v: number) => `R$ ${v.toFixed(2).replace(".", ",")}`;

export type KmAfiliadoState = { ok: boolean; erro?: string; msg?: string };

export async function salvarKmAfiliado(_prev: KmAfiliadoState, formData: FormData): Promise<KmAfiliadoState> {
  const loja = await getMinhaLoja();
  if (!loja) return { ok: false, erro: "Faça login com a conta da loja." };

  const id = String(formData.get("id") ?? "");
  const desligar = formData.get("acao") === "desligar";
  const valorKm = Number(String(formData.get("valor_km") ?? "").replace(",", "."));
  if (!id) return { ok: false, erro: "Produto inválido." };
  if (!desligar && !(valorKm >= loja.piso_km_afiliado)) {
    return { ok: false, erro: `O valor por km não pode ficar abaixo do piso da loja (${reais(loja.piso_km_afiliado)}).` };
  }

  const supabase = await createClient();
  // Desligar mantém o último R$/km guardado, para religar sem digitar de novo.
  const { data, error } = await supabase
    .from("produtos")
    .update(desligar ? { permite_logistica_afiliado: false } : { permite_logistica_afiliado: true, valor_km_afiliado: valorKm })
    .eq("id", id)
    .eq("loja_id", loja.id)
    .select("id");
  if (error) return { ok: false, erro: error.message };
  if (!data?.length) return { ok: false, erro: "Produto não encontrado nesta loja." };

  revalidatePath("/seller/produtos");
  return { ok: true, msg: desligar ? "Entrega por parceiro desligada." : `Parceiro ativado a ${reais(valorKm)} por km.` };
}

// valores: o React 19 limpa o form depois da action; devolvê-los mantém os campos preenchidos.
type Valores = { origem: string; destino: string; valorKm: string };
export type SimulacaoKmState =
  | { ok: false; erro?: string; valores?: Valores }
  | { ok: true; km: number; minutos: number; preco: number; embed: string; valores: Valores };

const ERRO_GEO: Record<string, string> = {
  nao_configurado: "Integração com o Google Maps pendente (sem chave no servidor).",
  sem_rota: "O Google não encontrou rota entre os dois endereços.",
  teto_de_custo: "Limite diário de consultas ao Google Maps atingido. Tente amanhã.",
  provedor_indisponivel: "Google Maps indisponível agora. Tente de novo em instantes.",
};

// Só seller: cada simulação é uma consulta paga na Routes API.
export async function simularKm(_prev: SimulacaoKmState, formData: FormData): Promise<SimulacaoKmState> {
  const loja = await getMinhaLoja();
  if (!loja) return { ok: false, erro: "O simulador é do painel do seller: entre com a conta da loja." };

  const origem = String(formData.get("origem") ?? "").trim();
  const destino = String(formData.get("destino") ?? "").trim();
  const valorKm = Number(String(formData.get("valor_km") ?? "").replace(",", "."));
  const valores = { origem, destino, valorKm: String(formData.get("valor_km") ?? "") };
  if (!origem || !destino) return { ok: false, erro: "Informe origem e destino (CEP ou endereço).", valores };

  const r = await calcularTrajeto(origem, destino);
  if (!r.ok) return { ok: false, erro: ERRO_GEO[r.erro], valores };

  const p = precoPorKm({ distanciaM: r.valor.distancia_m, valorKm, pisoKm: loja.piso_km_afiliado });
  if (!p.ok) return { ok: false, erro: `O valor por km não pode ficar abaixo do piso da loja (${reais(p.piso)}).`, valores };
  return { ok: true, km: p.kmCobrados, minutos: Math.round(r.valor.duracao_s / 60), preco: p.preco, embed: embedTrajeto(origem, destino), valores };
}
