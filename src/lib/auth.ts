import * as Sentry from "@sentry/nextjs";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/supabase/database.types";
import { destinoPorPapel } from "@/lib/auth-destino";

// Helpers de sessão compartilhados entre os módulos seller, admin e afiliado.
// RLS já filtra por auth.uid(); estes helpers só resolvem o usuário e a loja dele.

export async function getUser() {
  const supabase = await createClient();
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user;
  } catch (erro) {
    // getUser() lança (em vez de retornar null) quando o cookie de sessão
    // existe mas o refresh token não é mais válido. Trata como deslogado
    // em vez de derrubar a página no error boundary genérico (PR #186).
    Sentry.captureException(erro, { tags: { area: "auth", step: "getUser" } });
    return null;
  }
}

// Admin? Consulta public.admins (policy admins_self_read só devolve a própria linha).
export async function isAdmin(): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase.from("admins").select("user_id").limit(1).maybeSingle();
  return data !== null;
}

// Roles são só rótulo/gate de aplicação (0085) — is_admin() no banco continua
// tratando qualquer admin como pleno, sem granularidade de RLS por enquanto.
export async function isSuperAdmin(): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("is_super_admin");
  return data === true;
}

export async function hasRole(roles: string[]): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("has_role", { p_roles: roles });
  return data === true;
}

// Destino do painel pós-login quando não há `next` explícito. Resolvido no
// SERVIDOR — o client não deve consultar `admins` direto pra decidir rota
// (era o bug: login sem next ignorava comprador/afiliado/parceiro e mandava
// todo mundo pra /seller, que então rebatia em /login?erro=sem_loja).
export async function resolverDestinoPorPapel(): Promise<string> {
  const user = await getUser();
  if (!user) return "/";
  if (await isAdmin()) return "/admin";

  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- tabela 0039 fora dos tipos gerados
  const db = supabase as any;
  const [{ data: loja }, { data: afiliacao }, { data: parceiro }] = await Promise.all([
    supabase.from("lojas").select("id").eq("owner_id", user.id).limit(1).maybeSingle(),
    supabase.from("afiliacoes").select("id").eq("afiliado_id", user.id).limit(1).maybeSingle(),
    db.from("parceiros_logisticos").select("id").eq("user_id", user.id).limit(1).maybeSingle(),
  ]);
  return destinoPorPapel({
    admin: false,
    temLoja: Boolean(loja),
    temAfiliacao: Boolean(afiliacao),
    temParceiro: Boolean(parceiro),
  });
}

// Parceiro logístico? Linha em parceiros_logisticos (0039) que não esteja
// Suspenso — Pendente entra (vê o próprio cadastro em análise). Filtro
// explícito por user_id além da RLS: a policy parceiros_admin_all daria
// SELECT em linha alheia se o chamador for admin.
export async function ehParceiroLogistico(): Promise<boolean> {
  const user = await getUser();
  if (!user) return false;
  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- status fora do union gerado
  const { data } = await (supabase as any)
    .from("parceiros_logisticos")
    .select("status")
    .eq("user_id", user.id)
    .neq("status", "Suspenso")
    .limit(1)
    .maybeSingle();
  return data !== null;
}

// Afiliado? Linha em afiliacoes com status Aprovada ou Suspensa (decisão do
// dono 28/08: suspenso ainda abre o painel pra ver a própria situação;
// Pendente/Rejeitada não). Filtro por afiliado_id além da RLS — a policy
// afiliacoes_loja_owner_all daria SELECT nas afiliações da loja do chamador.
export async function ehAfiliado(): Promise<boolean> {
  const user = await getUser();
  if (!user) return false;
  const supabase = await createClient();
  const { data } = await supabase
    .from("afiliacoes")
    .select("id")
    .eq("afiliado_id", user.id)
    .in("status", ["Aprovada", "Suspensa"])
    .limit(1)
    .maybeSingle();
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
