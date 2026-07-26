"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isSuperAdmin } from "@/lib/auth";

const ROLES = new Set(["super_admin", "moderador", "financeiro"]);

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
