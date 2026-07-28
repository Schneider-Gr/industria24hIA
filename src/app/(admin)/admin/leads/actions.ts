"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isAdmin, getUser } from "@/lib/auth";

const STATUS = ["novo", "em_contato", "convertido", "descartado"] as const;
type Status = (typeof STATUS)[number];

// Tipos manuais: `leads`/`lead_interacoes` (migrations 0088/0090) ainda fora
// de database.types.ts, mesmo motivo documentado em src/lib/ai/botDb.ts.
interface ClientComLeads {
  from(table: "leads"): {
    update(values: { status: Status } | { responsavel_id: string | null }): {
      eq(col: "id", val: string): Promise<{ error: { message: string } | null }>;
    };
  };
}
interface ClientComInteracoes {
  from(table: "lead_interacoes"): {
    insert(values: { lead_id: string; autor_id: string; conteudo: string }): Promise<{
      error: { message: string } | null;
    }>;
  };
}

export async function setStatusLead(formData: FormData) {
  if (!(await isAdmin())) throw new Error("Acesso restrito a administradores.");
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!id || !STATUS.includes(status as Status)) throw new Error("Parâmetros inválidos.");

  const supabase = (await createClient()) as unknown as ClientComLeads;
  const { error } = await supabase.from("leads").update({ status: status as Status }).eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/leads");
}

export async function atribuirResponsavel(formData: FormData) {
  if (!(await isAdmin())) throw new Error("Acesso restrito a administradores.");
  const id = String(formData.get("id") ?? "");
  const responsavelId = String(formData.get("responsavel_id") ?? "");
  if (!id) throw new Error("Lead inválido.");

  const supabase = (await createClient()) as unknown as ClientComLeads;
  const { error } = await supabase
    .from("leads")
    .update({ responsavel_id: responsavelId || null })
    .eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/leads");
}

export async function registrarInteracao(formData: FormData) {
  if (!(await isAdmin())) throw new Error("Acesso restrito a administradores.");
  const leadId = String(formData.get("lead_id") ?? "");
  const conteudo = String(formData.get("conteudo") ?? "").trim();
  if (!leadId || !conteudo) throw new Error("Nota vazia ou lead inválido.");

  const user = await getUser();
  if (!user) throw new Error("Sessão inválida.");

  const supabase = (await createClient()) as unknown as ClientComInteracoes;
  const { error } = await supabase
    .from("lead_interacoes")
    .insert({ lead_id: leadId, autor_id: user.id, conteudo });
  if (error) throw new Error(error.message);

  revalidatePath("/admin/leads");
}
