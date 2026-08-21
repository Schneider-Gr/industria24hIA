import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { getUser, isAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await getUser();
  // Sem sessão: manda pro login preservando o destino.
  if (!user) redirect("/login?next=/admin");
  // Logado mas sem permissão de admin: mesmo padrão do /seller — volta pro
  // login com aviso em vez de sumir silenciosamente na home.
  if (!(await isAdmin())) redirect("/login?next=/admin&erro=sem_acesso_admin");

  const supabase = await createClient();
  const [
    { count: lojasPendentes },
    { count: produtosPendentes },
    { count: afiliacoesPendentes },
    { count: entregasEmTransito },
    { count: disputasEmMediacao },
  ] = await Promise.all([
    supabase
      .from("lojas")
      .select("id", { count: "exact", head: true })
      .eq("situacao", "EmAnalise"),
    supabase
      .from("produtos")
      .select("id", { count: "exact", head: true })
      .eq("status_produto", "Pendente"),
    supabase
      .from("afiliacoes")
      .select("id", { count: "exact", head: true })
      .neq("status", "Aprovada"),
    supabase
      .from("entregas")
      .select("linha_item_id", { count: "exact", head: true })
      .neq("status", "Entregue"),
    supabase
      .from("disputas")
      .select("id", { count: "exact", head: true })
      .eq("status", "em_mediacao_admin"),
  ]);

  // Mesmos contadores da fila de curadoria, repetidos na sidebar.
  const badges = {
    "/admin/lojas": lojasPendentes ?? 0,
    "/admin/produtos": produtosPendentes ?? 0,
    "/admin/afiliados": afiliacoesPendentes ?? 0,
    "/admin/entregas": entregasEmTransito ?? 0,
    "/admin/disputas": disputasEmMediacao ?? 0,
  };

  return (
    <AdminShell userEmail={user?.email ?? "administrador"} badges={badges}>
      {children}
    </AdminShell>
  );
}
