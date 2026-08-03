"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { isAdmin, isSuperAdmin, hasRole, getUser } from "@/lib/auth";
import type { Json } from "@/lib/supabase/database.types";

const ROLES = new Set(["super_admin", "moderador", "financeiro"]);

// auditoria_eventos não tem policy de INSERT pra authenticated (0034: "nunca
// pelo client, só triggers ou service_role") — usa o mesmo client de service
// role já necessário pro Admin API abaixo.
async function registrarAuditoria(acao: string, registroId: string | null, dados: Record<string, unknown>) {
  const service = createServiceClient();
  const user = await getUser();
  await service.from("auditoria_eventos").insert({
    ator_id: user?.id ?? null,
    ator_papel: "admin",
    acao,
    tabela: "auth.users",
    registro_id: registroId,
    dados_depois: dados as Json,
  });
}

// Promove/rebaixa um admin (RPC 0085, security definer, só super_admin).
// Gate aqui também é defesa em profundidade — a RPC já checa is_super_admin().
export async function definirRole(formData: FormData) {
  if (!(await isSuperAdmin())) throw new Error("Acesso restrito a super-admin.");

  const userId = String(formData.get("user_id") ?? "");
  const role = String(formData.get("role") ?? "");
  if (!userId) throw new Error("Usuário inválido.");
  if (!ROLES.has(role)) throw new Error("Role inválido.");

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_definir_role", {
    p_user_id: userId,
    p_role: role,
  });
  if (error) throw new Error(error.message);

  revalidatePath("/admin/usuarios");
}

// GoTrue não tem "ban permanente" nativo — usa duração longa (10 anos) como
// padrão de facto pra ban indefinido. gate super_admin|moderador (não é
// decisão só-financeira, mas ainda sensível o bastante pra não deixar
// qualquer admin banir sozinho).
export async function banirUsuario(formData: FormData) {
  if (!(await hasRole(["super_admin", "moderador"]))) {
    throw new Error("Acesso restrito a super-admin ou moderador.");
  }
  const userId = String(formData.get("user_id") ?? "");
  const motivo = String(formData.get("motivo") ?? "").trim();
  if (!userId) throw new Error("Usuário inválido.");
  if (!motivo) throw new Error("Descreva o motivo do banimento.");

  // banirUsuario chama o Admin API do GoTrue direto (não é uma RPC do
  // banco) — rate limit checado aqui em código, mesma função checar_rate_limit
  // (0087) usada dentro de admin_estornar_pedido.
  const supabaseRl = await createClient();
  const { data: dentroDoLimite } = await supabaseRl.rpc("checar_rate_limit", {
    p_acao: "usuario.banido",
    p_limite: 20,
    p_janela_min: 5,
  });
  if (dentroDoLimite === false) {
    throw new Error("Limite de banimentos excedido — tente novamente em alguns minutos.");
  }

  const service = createServiceClient();
  const { error } = await service.auth.admin.updateUserById(userId, { ban_duration: "87600h" });
  if (error) throw new Error(error.message);

  await registrarAuditoria("usuario.banido", userId, { motivo });
  revalidatePath("/admin/usuarios");
}

export async function desbanirUsuario(formData: FormData) {
  if (!(await hasRole(["super_admin", "moderador"]))) {
    throw new Error("Acesso restrito a super-admin ou moderador.");
  }
  const userId = String(formData.get("user_id") ?? "");
  if (!userId) throw new Error("Usuário inválido.");

  const service = createServiceClient();
  const { error } = await service.auth.admin.updateUserById(userId, { ban_duration: "none" });
  if (error) throw new Error(error.message);

  await registrarAuditoria("usuario.desbanido", userId, {});
  revalidatePath("/admin/usuarios");
}

// Não precisa de service_role — resetPasswordForEmail é método público do
// GoTrue, reaproveita o fluxo de e-mail "esqueci minha senha" já existente.
export async function resetarSenhaUsuario(formData: FormData) {
  if (!(await isAdmin())) throw new Error("Acesso restrito a administradores.");

  const email = String(formData.get("email") ?? "").trim();
  if (!email) throw new Error("E-mail inválido.");

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email);
  if (error) throw new Error(error.message);

  await registrarAuditoria("usuario.reset_senha_solicitado", null, { email });
}
