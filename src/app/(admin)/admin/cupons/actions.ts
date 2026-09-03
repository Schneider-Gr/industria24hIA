"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/auth";

// Cupom de desconto (0156): MVP só admin/plataforma — ver
// openspec/changes/add-cupom-desconto-checkout. Escrita garantida pela
// policy is_admin (FOR ALL); o gate aqui é defesa em profundidade, mesmo
// padrão de admin/categorias/actions.ts.

async function exigirAdmin() {
  if (!(await isAdmin())) throw new Error("Acesso restrito a administradores.");
}

type RegraInput = { alvo: string; alvo_id: string; tipo: string; valor: string };

function parseRegras(formData: FormData): RegraInput[] {
  const raw = String(formData.get("regras_json") ?? "[]");
  let regras: RegraInput[];
  try {
    regras = JSON.parse(raw);
  } catch {
    throw new Error("Regras inválidas.");
  }
  if (!Array.isArray(regras) || regras.length === 0) {
    throw new Error("O cupom precisa de pelo menos uma regra.");
  }
  return regras;
}

export async function criarCupom(formData: FormData) {
  await exigirAdmin();
  const codigo = String(formData.get("codigo") ?? "").trim();
  const validade_inicio = String(formData.get("validade_inicio") ?? "");
  const validade_fim = String(formData.get("validade_fim") ?? "");
  const valorMinimoRaw = String(formData.get("valor_minimo_pedido") ?? "").trim();
  const limiteGlobalRaw = String(formData.get("limite_global") ?? "").trim();
  const limitePorCliente = Number(formData.get("limite_por_cliente") ?? "1") || 1;

  if (!codigo) throw new Error("Código é obrigatório.");
  if (!validade_inicio || !validade_fim) throw new Error("Informe a janela de validade.");

  const regras = parseRegras(formData).map((r) => ({
    alvo: r.alvo,
    alvo_id: r.alvo === "tudo" ? null : r.alvo_id.trim() || null,
    tipo: r.tipo,
    valor: Number(r.valor),
  }));
  for (const r of regras) {
    if (!r.valor || r.valor <= 0) throw new Error("Toda regra precisa de um valor positivo.");
    if (r.tipo === "percentual" && r.valor > 100) throw new Error("Percentual não pode passar de 100.");
    if (r.alvo !== "tudo" && !r.alvo_id) throw new Error(`Regra de alvo "${r.alvo}" exige o ID do alvo.`);
  }

  const supabase = await createClient();
  const { data: cupom, error } = await supabase
    .from("cupons")
    .insert({
      codigo,
      dono: "plataforma",
      validade_inicio: new Date(validade_inicio).toISOString(),
      validade_fim: new Date(validade_fim).toISOString(),
      valor_minimo_pedido: valorMinimoRaw ? Number(valorMinimoRaw) : null,
      limite_global: limiteGlobalRaw ? Number(limiteGlobalRaw) : null,
      limite_por_cliente: limitePorCliente,
    })
    .select("id")
    .single();
  if (error || !cupom) throw new Error(error?.message ?? "Falha ao criar cupom.");

  const { error: regrasError } = await supabase
    .from("cupom_regras")
    .insert(regras.map((r) => ({ ...r, cupom_id: cupom.id })));
  if (regrasError) {
    await supabase.from("cupons").delete().eq("id", cupom.id);
    throw new Error(regrasError.message);
  }

  revalidatePath("/admin/cupons");
}

export async function alternarCupom(formData: FormData) {
  await exigirAdmin();
  const id = String(formData.get("id") ?? "");
  const ativo = formData.get("ativo") === "true";
  if (!id) throw new Error("Cupom inválido.");

  const supabase = await createClient();
  const { error } = await supabase.from("cupons").update({ ativo: !ativo }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/cupons");
}
