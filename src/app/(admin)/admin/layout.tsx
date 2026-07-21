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
  // Mesmo comportamento do Bubble: não-admin em /admin rebate para a home.
  if (!user || !(await isAdmin())) redirect("/");

  const supabase = await createClient();
  const [
    { count: lojasPendentes },
    { count: produtosPendentes },
    { count: afiliacoesPendentes },
    { count: entregasEmTransito },
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
  ]);

  // Mesmos contadores da fila de curadoria, repetidos na sidebar.
  const badges = {
    "/admin/lojas": lojasPendentes ?? 0,
    "/admin/produtos": produtosPendentes ?? 0,
    "/admin/afiliados": afiliacoesPendentes ?? 0,
    "/admin/entregas": entregasEmTransito ?? 0,
  };

  return (
    <AdminShell userEmail={user?.email ?? "administrador"} badges={badges}>
      {children}
    </AdminShell>
  );
}
