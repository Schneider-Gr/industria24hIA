"use client";

import { useState } from "react";
import { Sidebar } from "@/components/seller/Sidebar";
import { TourProvider } from "@/components/seller/TourGuiado";
import { sair } from "@/lib/auth-actions";

type SellerShellProps = {
  userLabel: string;
  userEmail?: string | null;
  children: React.ReactNode;
};

// Shell do painel do vendedor: sidebar off-canvas em mobile, fixa em md+.
export function SellerShell({ userLabel, userEmail, children }: SellerShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const inicial = userEmail?.trim().charAt(0).toUpperCase() || "?";

  return (
    <TourProvider>
    <div className="flex min-h-screen flex-1">
      <Sidebar mobileOpen={mobileOpen} onNavigate={() => setMobileOpen(false)} />
      {mobileOpen && (
        <button
          type="button"
          aria-label="Fechar menu"
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
        />
      )}
      <div className="flex flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-line bg-surface/95 px-4 shadow-sm backdrop-blur md:px-6">
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

          <div className="flex min-w-0 flex-1 items-center gap-2.5">
            {userEmail && (
              <span
                aria-hidden="true"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-aco-900 text-sm font-semibold text-white"
              >
                {inicial}
              </span>
            )}
            <span className="truncate text-sm font-medium text-ink">{userLabel}</span>
          </div>

          {userEmail && (
          <form action={sair}>
            <button
              type="submit"
              className="flex shrink-0 items-center gap-1.5 rounded border border-line px-3 py-1.5 text-sm text-ink-2 transition-colors hover:border-erro hover:text-erro"
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
              <span className="hidden sm:inline">Sair</span>
            </button>
          </form>
          )}
        </header>
        <main className="flex-1 overflow-x-hidden bg-surface p-4 md:p-6">{children}</main>
      </div>
    </div>
    </TourProvider>
  );
}
