"use client";

import { useState } from "react";
import { AfiliadoSidebar } from "@/components/afiliado/AfiliadoSidebar";
import { sair } from "@/lib/auth-actions";

/** Shell do painel do afiliado: sidebar off-canvas no mobile, fixa em md+. */
export function AfiliadoShell({
  email,
  children,
}: {
  email?: string | null;
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-background">
      <AfiliadoSidebar mobileOpen={mobileOpen} onNavigate={() => setMobileOpen(false)} />
      {mobileOpen && (
        <button
          type="button"
          aria-label="Fechar menu"
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
        />
      )}

      <main className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 border-b border-line bg-surface px-4 py-2.5 md:px-5">
          <button
            type="button"
            aria-label="Abrir menu"
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((o) => !o)}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-sm border border-line text-ink md:hidden"
          >
            <svg
              viewBox="0 0 24 24"
              width={16}
              height={16}
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              aria-hidden="true"
            >
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          <span className="min-w-0 flex-1 truncate text-xs tracking-[0.04em] text-muted">
            {email ?? "Painel do afiliado"}
          </span>

          {email && (
            <form action={sair}>
              <button
                type="submit"
                className="flex items-center gap-1.5 text-xs tracking-[0.04em] text-aco-600 hover:underline"
              >
                <svg
                  viewBox="0 0 24 24"
                  width={15}
                  height={15}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.75}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <path d="M16 17l5-5-5-5M21 12H9" />
                </svg>
                Sair
              </button>
            </form>
          )}
        </header>

        <div className="flex-1 p-4 md:p-5">{children}</div>
      </main>
    </div>
  );
}
