"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isAdmin, getUser } from "@/lib/auth";
import { enviarWhatsapp, isWhatsappConfigured } from "@/lib/whatsapp";
import { enviarEmail, isEmailConfigured } from "@/lib/email";

const STATUS = ["novo", "em_contato", "convertido", "descartado"] as const;
type Status = (typeof STATUS)[number];

// Tipos manuais: `leads`/`lead_interacoes` (migrations 0088/0090/0127) ainda
// fora de database.types.ts, mesmo motivo documentado em src/lib/ai/botDb.ts.
interface ClientComLeads {
  from(table: "leads"): {
    update(
      values:
        | { status: Status }
        | { responsavel_id: string | null }
        | { nome: string | null; contato: string; interesse: string | null; fonte: "manual" },
    ): {
      eq(col: "id", val: string): Promise<{ error: { message: string } | null }>;
    };
    insert(values: { nome: string | null; contato: string; interesse: string | null; fonte: "manual"; etapa_funil: string }): {
      select(cols: string): { single(): Promise<{ data: { id: string } | null; error: { message: string } | null }> };
    };
    select(cols: string): {
      eq(col: "id", val: string): { maybeSingle(): Promise<{ data: { whatsapp_optin_at: string | null; contato: string } | null }> };
    };
  };
  rpc(fn: "buscar_lead_duplicado", args: { p_contato: string }): Promise<{ data: string | null }>;
  rpc(fn: "registrar_optin_whatsapp", args: { p_lead_id: string; p_texto: string }): Promise<{ error: { message: string } | null }>;
}
interface ClientComInteracoes {
  from(table: "lead_interacoes"): {
    insert(values: { lead_id: string; autor_id: string; conteudo: string }): Promise<{
      error: { message: string } | null;
    }>;
  };
  from(table: "lead_followups"): {
    insert(values: { lead_id: string; canal: "whatsapp" | "email"; template: string; enviado_por: string }): Promise<{
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

export type RegistrarLeadManualState = { error: string | null };

// US09 (Instagram/DM) e US18 (dedupe): registro manual cobre qualquer
// contato feito fora do bot (Instagram, telefone, presencial). Antes de
// criar, verifica se já existe lead com o mesmo contato — em vez de criar
// duplicata, retorna erro apontando o lead existente.
//
// Assinatura (prevState, formData) porque é chamada via useActionState no
// client (LeadManualForm) — achado de QA ao vivo (PR #302): um form action
// direto que lança Error faz o Next cair na error boundary genérica
// ("Algo deu errado") em vez de mostrar a mensagem de duplicidade inline.
export async function registrarLeadManual(_prevState: RegistrarLeadManualState, formData: FormData): Promise<RegistrarLeadManualState> {
  if (!(await isAdmin())) return { error: "Acesso restrito a administradores." };
  const nome = String(formData.get("nome") ?? "").trim() || null;
  const contato = String(formData.get("contato") ?? "").trim();
  const interesse = String(formData.get("interesse") ?? "").trim() || null;
  if (!contato) return { error: "Contato é obrigatório." };

  const supabase = (await createClient()) as unknown as ClientComLeads;

  const { data: duplicadoId } = await supabase.rpc("buscar_lead_duplicado", { p_contato: contato });
  if (duplicadoId) {
    return { error: `Já existe um lead com esse contato (id ${duplicadoId}) — registre a interação nele em vez de duplicar.` };
  }

  const { error } = await supabase
    .from("leads")
    .insert({ nome, contato, interesse, fonte: "manual", etapa_funil: "persona_identificada" })
    .select("id")
    .single();
  if (error) return { error: error.message };

  revalidatePath("/admin/leads");
  return { error: null };
}

// US14: opt-in é pré-requisito de compliance Meta para follow-up de
// WhatsApp fora da janela de 24h — registrado explicitamente, nunca assumido.
export async function registrarOptinWhatsapp(formData: FormData) {
  if (!(await isAdmin())) throw new Error("Acesso restrito a administradores.");
  const leadId = String(formData.get("lead_id") ?? "");
  const texto = String(formData.get("texto") ?? "").trim();
  if (!leadId || !texto) throw new Error("Texto de opt-in é obrigatório.");

  const supabase = (await createClient()) as unknown as ClientComLeads;
  const { error } = await supabase.rpc("registrar_optin_whatsapp", { p_lead_id: leadId, p_texto: texto });
  if (error) throw new Error(error.message);

  revalidatePath("/admin/leads");
}

// US12/US13: dispara o follow-up e audita o envio. Sem template Meta
// aprovado configurado ainda (nenhum WABA de template neste repo — ver
// src/lib/whatsapp.ts), então reusa o envio de texto livre existente; só
// funciona dentro da janela de 24h até o template chegar (ponytail: upgrade
// natural quando o ticket de templates do mapa #124 fechar).
export async function enviarFollowupWhatsapp(formData: FormData) {
  if (!(await isAdmin())) throw new Error("Acesso restrito a administradores.");
  const leadId = String(formData.get("lead_id") ?? "");
  const template = String(formData.get("template") ?? "").trim();
  if (!leadId || !template) throw new Error("Mensagem é obrigatória.");
  if (!isWhatsappConfigured) throw new Error("WhatsApp não configurado (integração pendente).");

  const user = await getUser();
  if (!user) throw new Error("Sessão inválida.");

  const supabase = (await createClient()) as unknown as ClientComLeads;
  const { data: lead } = await supabase.from("leads").select("whatsapp_optin_at, contato").eq("id", leadId).maybeSingle();
  if (!lead?.whatsapp_optin_at) throw new Error("Lead sem opt-in de WhatsApp registrado — registre o opt-in antes de enviar.");

  const enviado = await enviarWhatsapp(lead.contato, template);
  if (!enviado) throw new Error("Falha ao enviar via WhatsApp.");

  const svcInteracoes = supabase as unknown as ClientComInteracoes;
  const { error } = await svcInteracoes.from("lead_followups").insert({ lead_id: leadId, canal: "whatsapp", template, enviado_por: user.id });
  if (error) throw new Error(error.message);

  revalidatePath("/admin/leads");
}

export type EnviarFollowupEmailState = { error: string | null; ok: boolean };

// US15: liberado depois que o domínio validou no Resend (RESEND_API_KEY
// presente — src/lib/email.ts). Sem opt-in obrigatório (regra é só WhatsApp,
// política Meta) — mas exige o contato do lead parecer um e-mail.
// Assinatura (leadId, prevState, formData) porque é chamada via
// useActionState com `.bind(null, leadId)` (EmailFollowupForm) — mesmo
// padrão de registrarLeadManual, achado de QA (PR #302).
export async function enviarFollowupEmail(
  leadId: string,
  _prevState: EnviarFollowupEmailState,
  formData: FormData,
): Promise<EnviarFollowupEmailState> {
  if (!(await isAdmin())) return { error: "Acesso restrito a administradores.", ok: false };
  const template = String(formData.get("template") ?? "").trim();
  if (!template) return { error: "Mensagem é obrigatória.", ok: false };
  if (!isEmailConfigured) return { error: "E-mail não configurado (integração pendente).", ok: false };

  const user = await getUser();
  if (!user) return { error: "Sessão inválida.", ok: false };

  const supabase = (await createClient()) as unknown as ClientComLeads;
  const { data: lead } = await supabase.from("leads").select("whatsapp_optin_at, contato").eq("id", leadId).maybeSingle();
  if (!lead?.contato.includes("@")) return { error: "O contato deste lead não é um e-mail — use o follow-up de WhatsApp.", ok: false };

  const { enviado, erro } = await enviarEmail({ to: lead.contato, subject: "Indústria 24h — continuando nosso contato", text: template });
  if (!enviado) return { error: `Falha ao enviar e-mail: ${erro}`, ok: false };

  const svcInteracoes2 = supabase as unknown as ClientComInteracoes;
  const { error } = await svcInteracoes2.from("lead_followups").insert({ lead_id: leadId, canal: "email", template, enviado_por: user.id });
  if (error) return { error: error.message, ok: false };

  revalidatePath("/admin/leads");
  return { error: null, ok: true };
}
