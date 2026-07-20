"use client";

import { useState } from "react";
import { Sidebar } from "@/components/admin/Sidebar";

type AdminShellProps = {
  userEmail: string;
  badges?: Record<string, number>;
  children: React.ReactNode;
};

// Shell do painel admin: sidebar off-canvas em mobile, fixa em md+.
export function AdminShell({ userEmail, badges, children }: AdminShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen w-full bg-surface dark:bg-surface">
      <Sidebar mobileOpen={mobileOpen} onNavigate={() => setMobileOpen(false)} badges={badges} />
      {mobileOpen && (
        <button
          type="button"
          aria-label="Fechar menu"
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
        />
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-3 border-b border-line bg-surface px-4 py-4 dark:border-line dark:bg-surface md:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              aria-label="Abrir menu"
              aria-expanded={mobileOpen}
              onClick={() => setMobileOpen((open) => !open)}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded border border-line text-ink md:hidden"
            >
              <span className="sr-only">Abrir menu</span>
              <svg
                viewBox="0 0 24 24"
                width={18}
                height={18}
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                aria-hidden="true"
              >
                <path d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <span className="truncate text-sm text-ink-2 dark:text-ink-2">
              Bem-vindo, <strong>{userEmail}</strong>
            </span>
          </div>
          <span className="shrink-0 rounded bg-aco-100 px-2.5 py-0.5 text-xs font-semibold text-aco-600 dark:bg-aco-100 dark:text-aco-600">
            Admin
          </span>
        </header>
        <main className="min-w-0 flex-1 overflow-x-hidden p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
