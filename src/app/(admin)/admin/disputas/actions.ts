"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/auth";
import { validarValorReembolso } from "@/lib/disputas";

// Admin decide o desfecho final da disputa (PRD 009 US04) — RLS
// disputas_admin_all + guard_campos_restritos (0104) garantem que só admin
// grava os campos de decisão; validação de valor roda aqui além do banco.
export async function decidirDisputa(formData: FormData) {
  if (!(await isAdmin())) throw new Error("Apenas admin decide o desfecho de uma disputa.");

  const disputaId = formData.get("disputa_id");
  const decisao = formData.get("decisao");
  const justificativa = formData.get("justificativa");
  const valorRaw = formData.get("decisao_valor");

  if (!disputaId || typeof disputaId !== "string") throw new Error("Disputa inválida.");
  if (!decisao || typeof decisao !== "string") throw new Error("Selecione o desfecho.");
  if (!justificativa || typeof justificativa !== "string" || justificativa.trim().length === 0) {
    throw new Error("Justificativa é obrigatória.");
  }

  const supabase = await createClient();
  const { data: disputa } = await supabase
    .from("disputas")
    .select("id, linha_item_id, status")
    .eq("id", disputaId)
    .maybeSingle();
  if (!disputa) throw new Error("Disputa não encontrada.");
  if (disputa.status === "resolvida") throw new Error("Disputa já foi decidida.");

  let valorItem = 0;
  if (disputa.linha_item_id) {
    const { data: item } = await supabase
      .from("linha_itens")
      .select("valor")
      .eq("id", disputa.linha_item_id)
      .maybeSingle();
    valorItem = item?.valor ?? 0;
  }

  const valor = valorRaw && typeof valorRaw === "string" && valorRaw.trim() ? Number(valorRaw) : null;
  validarValorReembolso(decisao, valor, valorItem);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase
    .from("disputas")
    .update({
      status: "resolvida",
      decisao,
      decisao_valor: valor,
      decisao_justificativa: justificativa.trim(),
      decidida_em: new Date().toISOString(),
      decidida_por: user?.id ?? null,
      resolvida_em: new Date().toISOString(),
    })
    .eq("id", disputaId);
  if (error) throw new Error("Não foi possível registrar a decisão.");

  revalidatePath("/admin/disputas");
  revalidatePath(`/admin/disputas/${disputaId}`);
}
