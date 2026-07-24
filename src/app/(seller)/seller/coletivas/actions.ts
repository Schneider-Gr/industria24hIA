"use server";

import { createClient } from "@/lib/supabase/server";
import { getMinhaLoja } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import type { Lote } from "@/lib/coletiva";

// Cancela uma coletiva em andamento da loja do seller. A RPC (0070/0078)
// valida no banco que o chamador é o dono da loja e que ninguém foi cobrado.
export async function cancelarColetiva(formData: FormData) {
  const coletivaId = String(formData.get("coletiva_id") ?? "");
  if (!coletivaId) throw new Error("Coletiva inválida.");

  const supabase = await createClient();
  const { error } = await supabase.rpc("coletiva_cancelar", {
    p_coletiva_id: coletivaId,
  });
  if (error) throw new Error(`Não foi possível cancelar: ${error.message}`);

  revalidatePath("/seller/coletivas");
}

// Fecha na mão uma coletiva já viável (meta e mínimo de participantes batidos):
// gera os pedidos no melhor lote atingido sem esperar o prazo. A RPC
// coletiva_fechar (0077) recusa quem não é dono e quem ainda não é viável.
export async function fecharColetiva(formData: FormData) {
  const coletivaId = String(formData.get("coletiva_id") ?? "");
  if (!coletivaId) throw new Error("Coletiva inválida.");

  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- RPC 0077 fora dos tipos gerados
  const { error } = await (supabase.rpc as any)("coletiva_fechar", {
    p_coletiva_id: coletivaId,
    p_forcar: true,
  });
  if (error) throw new Error(`Não foi possível fechar: ${error.message}`);

  revalidatePath("/seller/coletivas");
}

// Grava a regra de coletiva do produto (migration 0076). Os lotes chegam do
// form como linhas paralelas lote_qtd[] / lote_valor[]; a validação da curva
// (decrescente, abaixo do preço base, no máximo 4) é do trigger no banco —
// aqui só o saneamento de forma.
export async function salvarRegra(formData: FormData) {
  const loja = await getMinhaLoja();
  if (!loja) throw new Error("Você precisa de uma loja para configurar coletivas.");

  const produtoId = String(formData.get("produto_id") ?? "");
  if (!produtoId) throw new Error("Escolha um produto.");

  const qtds = formData.getAll("lote_qtd").map((v) => Number(v));
  const valores = formData.getAll("lote_valor").map((v) => Number(v));
  const lotes: Lote[] = qtds
    .map((min_qtd, i) => ({ min_qtd, valor_unitario: valores[i] }))
    .filter((l) => Number.isFinite(l.min_qtd) && l.min_qtd > 0 && l.valor_unitario > 0)
    .sort((a, b) => a.min_qtd - b.min_qtd);

  const metaBruta = Number(formData.get("meta_qtd"));
  const maxBruto = Number(formData.get("max_participantes"));

  const supabase = await createClient();
  // O produto tem que ser da loja do seller — a policy da 0076 barra o resto,
  // mas conferir aqui dá mensagem honesta em vez de erro cru de RLS.
  const { data: produto } = await supabase
    .from("produtos")
    .select("id")
    .eq("id", produtoId)
    .eq("loja_id", loja.id)
    .maybeSingle();
  if (!produto) throw new Error("Produto não pertence à sua loja.");

  const linha = {
    produto_id: produtoId,
    ativo: formData.get("ativo") === "on",
    meta_qtd: Number.isFinite(metaBruta) && metaBruta > 0 ? metaBruta : null,
    min_participantes: Math.max(2, Number(formData.get("min_participantes")) || 2),
    max_participantes: Number.isFinite(maxBruto) && maxBruto > 0 ? maxBruto : null,
    prazo_dias: Math.min(30, Math.max(1, Number(formData.get("prazo_dias")) || 7)),
    lotes,
    frete_conjunto: formData.get("frete_conjunto") === "on",
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- tabela 0076 fora dos tipos gerados
  const { error } = await (supabase as any)
    .from("coletiva_regras")
    .upsert(linha, { onConflict: "produto_id" });
  if (error) throw new Error(`Não foi possível salvar a regra: ${error.message}`);

  revalidatePath("/seller/coletivas");
  revalidatePath(`/produto/${produtoId}`);
}
