import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { getUser, isAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await getUser();
  // Mesmo comportamento do Bubble: não-admin em /admin rebate para a home.
  if (!user || !(await isAdmin())) redirect("/");

  return <AdminShell userEmail={user?.email ?? "administrador"}>{children}</AdminShell>;
}
