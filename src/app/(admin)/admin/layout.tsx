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
    <div className="flex min-h-screen w-full bg-neutral-50 dark:bg-neutral-950">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-neutral-200 bg-white px-6 py-4 dark:border-neutral-800 dark:bg-neutral-900">
          <span className="text-sm text-neutral-600 dark:text-neutral-300">
            Bem-vindo, <strong>{user?.email ?? "administrador"}</strong>
          </span>
          <span className="rounded-full bg-violet-100 px-2.5 py-0.5 text-xs font-medium text-violet-800 dark:bg-violet-950 dark:text-violet-200">
            Admin
          </span>
        </header>
        <main className="min-w-0 flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
