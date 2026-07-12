"use client";

import { useState } from "react";
import { Sidebar } from "@/components/seller/Sidebar";

type SellerShellProps = {
  userLabel: string;
  children: React.ReactNode;
};

// Shell do painel do vendedor: sidebar off-canvas em mobile, fixa em md+.
export function SellerShell({ userLabel, children }: SellerShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
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
        <header className="flex h-14 items-center gap-3 border-b border-line px-4 md:px-6">
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
          <span className="truncate text-sm font-medium text-ink">{userLabel}</span>
        </header>
        <main className="flex-1 overflow-x-hidden bg-surface p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
