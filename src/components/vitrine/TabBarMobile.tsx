"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Tab bar fixa mobile-only (DESIGN.md "Aço & Sinal" pede navegação
// app-like no mobile). Escondida nas áreas que já têm chrome própria
// (admin/seller/afiliado) para não duplicar navegação.
const ROTAS_SEM_TABBAR = ["/admin", "/seller", "/afiliado"];

const ITENS = [
  { href: "/", label: "Início", icone: IconeInicio },
  { href: "/busca", label: "Buscar", icone: IconeBusca },
  { href: "/carrinho", label: "Carrinho", icone: IconeCarrinho },
  { href: "/vender-como-afiliado", label: "Afiliados", icone: IconeAfiliado },
  { href: "/login", label: "Conta", icone: IconeConta },
] as const;

export function TabBarMobile() {
  const pathname = usePathname();
  if (ROTAS_SEM_TABBAR.some((rota) => pathname.startsWith(rota))) return null;

  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 bottom-0 z-40 flex border-t border-aco-800 bg-aco-900 md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {ITENS.map(({ href, label, icone: Icone }) => {
        const ativo = href === "/" ? pathname === "/" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] tracking-[0.02em] ${
              ativo ? "text-sinal" : "text-white/60"
            }`}
          >
            <Icone className="h-5 w-5" ativo={ativo} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

type IconeProps = { className?: string; ativo?: boolean };

function IconeInicio({ className }: IconeProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden>
      <path d="M3 9.5 10 3l7 6.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 8.5V17h10V8.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconeBusca({ className }: IconeProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden>
      <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="1.6" />
      <path d="m14 14 3.5 3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function IconeCarrinho({ className }: IconeProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden>
      <path d="M3 4h2l1.6 9.6a1.5 1.5 0 0 0 1.5 1.4h6.8a1.5 1.5 0 0 0 1.5-1.2L18 7H6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="9" cy="17.5" r="1" fill="currentColor" />
      <circle cx="14.5" cy="17.5" r="1" fill="currentColor" />
    </svg>
  );
}

function IconeAfiliado({ className }: IconeProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden>
      <path d="M8 10a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" stroke="currentColor" strokeWidth="1.6" />
      <path d="M3 17c0-2.8 2.2-5 5-5s5 2.2 5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M13.5 5.5 17 3v3l-3.5 2.5M13.5 12l3.5 2.5v-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconeConta({ className }: IconeProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden>
      <circle cx="10" cy="7" r="3.2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M4 17c0-3.3 2.7-6 6-6s6 2.7 6 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
