import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/supabase/database.types";

// Helpers de sessão compartilhados entre os módulos seller e admin.
// RLS já filtra por auth.uid(); estes helpers só resolvem o usuário e a loja dele.

export async function getUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

// Admin? Consulta public.admins (policy admins_self_read só devolve a própria linha).
export async function isAdmin(): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase.from("admins").select("user_id").limit(1).maybeSingle();
  return data !== null;
}

// Loja do seller logado. Filtro por owner_id é OBRIGATÓRIO aqui (não confiar só na
// RLS): a policy pública lojas_public_read libera qualquer loja Ativa por select,
// então sem este filtro .limit(1).maybeSingle() podia devolver a loja Ativa de
// OUTRO seller (bug real: painel mostrando estoque/produtos de loja alheia).
export async function getMinhaLoja(): Promise<Tables<"lojas"> | null> {
  const supabase = await createClient();
  const user = await getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("lojas")
    .select("*")
    .eq("owner_id", user.id)
    .limit(1)
    .maybeSingle();
  return data ?? null;
}
