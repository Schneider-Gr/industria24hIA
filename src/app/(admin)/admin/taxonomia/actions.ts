"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { isAdmin } from "@/lib/auth";

// Importação da árvore de taxonomia (PRD 041, US01). Server action é POST
// público: o gate de papel fica em cada action, não só no layout.

const FONTE_GOOGLE =
  "https://www.google.com/basepages/producttype/taxonomy-with-ids.pt-BR.txt";

async function exigirAdmin() {
  if (!(await isAdmin())) throw new Error("Acesso restrito a administradores.");
}

/** Busca o arquivo da fonte. A prévia e a confirmação baixam cada uma a sua
 * cópia: a importação é idempotente pelo id de origem, então rebaixar é seguro
 * e evita carregar 600 KB de texto na sessão entre os dois passos. */
async function baixarTaxonomia(): Promise<string> {
  const resp = await fetch(FONTE_GOOGLE, { cache: "no-store" });
  if (!resp.ok) {
    throw new Error(
      `Fonte indisponível (HTTP ${resp.status}). Tente novamente ou importe o arquivo manualmente.`,
    );
  }
  const texto = await resp.text();
  if (!texto.includes(" - ")) {
    throw new Error("Arquivo em formato irreconhecível: nenhuma linha no formato \"<id> - A > B > C\".");
  }
  return texto;
}

export async function verPrevia() {
  await exigirAdmin();
  const conteudo = await baixarTaxonomia();

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("taxonomia_importar_previa", {
    p_conteudo: conteudo,
  });
  if (error) throw new Error(error.message);

  const p = data as Record<string, number | string | null>;
  const qs = new URLSearchParams({
    linhas: String(p.linhas ?? 0),
    novos: String(p.novos ?? 0),
    existentes: String(p.existentes ?? 0),
    ausentes: String(p.ausentes ?? 0),
    proprios: String(p.nos_proprios_preservados ?? 0),
    comissoes: String(p.comissoes_preservadas ?? 0),
    apelidos: String(p.apelidos_preservados ?? 0),
    afetados: String(p.produtos_afetados ?? 0),
    alteradas: String(p.comissao_efetiva_alterada ?? 0),
    versao: String(p.versao ?? "desconhecida"),
  });
  redirect(`/admin/taxonomia?${qs.toString()}`);
}

export async function confirmarImportacao() {
  await exigirAdmin();
  const conteudo = await baixarTaxonomia();

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("taxonomia_importar", {
    p_conteudo: conteudo,
  });
  if (error) throw new Error(error.message);

  const r = data as Record<string, number>;
  revalidatePath("/admin/taxonomia");
  redirect(
    `/admin/taxonomia?ok=1&novos=${r.novos ?? 0}&obsoletos=${r.obsoletos ?? 0}`,
  );
}

export async function salvarComissaoNo(formData: FormData) {
  await exigirAdmin();
  const id = String(formData.get("id") ?? "");
  const bruto = String(formData.get("comissao_pct") ?? "").trim();
  if (!id) throw new Error("Nó inválido.");

  // Vazio herda do ancestral; zero é comissão nula deliberada. Os dois são
  // estados distintos, como na 0180.
  const valor = bruto === "" ? null : Number(bruto.replace(",", "."));
  if (valor !== null && (Number.isNaN(valor) || valor < 0 || valor > 100)) {
    throw new Error("Percentual deve estar entre 0 e 100.");
  }

  // taxonomia_nos só tem política de SELECT (0184): pelo client do usuário o
  // update casa 0 linhas sem erro. A escrita passa pelo service role, depois do
  // gate de admin acima, e confere que alguma linha mudou.
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("taxonomia_nos")
    .update({ comissao_pct: valor })
    .eq("id", id)
    .select("id");
  if (error) throw new Error(error.message);
  if (!data?.length) throw new Error("Nó não encontrado; nada foi salvo.");
  revalidatePath("/admin/taxonomia");
}
