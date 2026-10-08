"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { sair } from "@/lib/auth-actions";

const ITENS = [
  { href: "/parceiro", label: "Corridas" },
  { href: "/parceiro/cadastro", label: "Meu cadastro" },
  { href: "/afiliado/logistica", label: "Entregas (afiliado)" },
] as const;

/** Shell do painel do parceiro logístico, no padrão do AfiliadoShell: menu
 *  off-canvas no celular (o painel é usado na rua, pelo celular), fixo em md+. */
export function ParceiroShell({ email, children }: { email?: string | null; children: React.ReactNode }) {
  const [aberto, setAberto] = useState(false);
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen bg-background">
      <aside
        aria-label="Menu do parceiro logístico"
        className={`fixed inset-y-0 left-0 z-40 flex w-[220px] shrink-0 -translate-x-full flex-col bg-aco-900 transition-transform duration-200 md:static md:z-auto md:w-[200px] md:translate-x-0 ${
          aberto ? "translate-x-0" : ""
        }`}
      >
        <div className="border-b border-aco-800 px-4 py-5">
          <p className="font-display text-lg font-bold leading-tight text-white">Indústria 24h</p>
          <p className="mt-1 text-xs text-white/70">Parceiro logístico</p>
        </div>
        <nav className="flex flex-1 flex-col py-2">
          {ITENS.map((item) => {
            const ativo = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setAberto(false)}
                aria-current={ativo ? "page" : undefined}
                className={`flex min-h-11 items-center border-l-[3px] px-4 text-sm transition-colors ${
                  ativo
                    ? "border-sinal bg-aco-800 text-white"
                    : "border-transparent text-white/70 hover:bg-aco-800 hover:text-white"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>
      {aberto && (
        <button
          type="button"
          aria-label="Fechar menu"
          onClick={() => setAberto(false)}
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
        />
      )}

      <main className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 border-b border-line bg-surface px-4 py-2.5 md:px-6 md:py-4">
          <button
            type="button"
            aria-label="Abrir menu"
            aria-expanded={aberto}
            onClick={() => setAberto((o) => !o)}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded border border-line text-ink md:hidden"
          >
            <svg viewBox="0 0 24 24" width={20} height={20} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true">
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <p className="min-w-0 flex-1 truncate text-sm text-ink-2">
            <span className="md:hidden">Parceiro logístico</span>
            <span className="hidden md:inline">Bem-vindo, {email}</span>
          </p>
          {email && (
            <form action={sair}>
              <button type="submit" className="flex min-h-11 items-center px-1 text-sm text-aco-600 hover:underline">
                Sair
              </button>
            </form>
          )}
        </header>

        {/* pb no celular: o botão flutuante de Atendimento não pode cobrir o último campo nem o "Salvar". */}
        <div className="flex-1 p-4 pb-28 md:p-6">{children}</div>
      </main>
    </div>
  );
}
