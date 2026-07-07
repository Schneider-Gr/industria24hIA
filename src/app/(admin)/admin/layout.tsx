import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/admin/Sidebar";
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

  return (
    <div className="flex min-h-screen w-full bg-surface dark:bg-surface">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-line bg-surface px-6 py-4 dark:border-line dark:bg-surface">
          <span className="text-sm text-ink-2 dark:text-ink-2">
            Bem-vindo, <strong>{user?.email ?? "administrador"}</strong>
          </span>
          <span className="rounded bg-amarelo/10 px-2.5 py-0.5 text-xs font-semibold text-amarelo dark:bg-amarelo/10 dark:text-amarelo">
            Admin
          </span>
        </header>
        <main className="min-w-0 flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
