"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

// Menu admin espelhando a UI real do Bubble (docs/admin-module.md).
const NAV = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/analise-geral", label: "Análise Geral" },
  { href: "/admin/usuarios", label: "Usuários" },
  { href: "/admin/afiliados", label: "Afiliados" },
  { href: "/admin/produtos", label: "Produtos" },
  { href: "/admin/lojas", label: "Lojas" },
  { href: "/admin/categorias", label: "Categorias" },
  { href: "/admin/promocoes", label: "Promoções" },
  { href: "/admin/editar-marketplace", label: "Editar Marketplace" },
  { href: "/admin/paginas", label: "Páginas" },
  { href: "/admin/pedidos", label: "Pedidos" },
  { href: "/admin/entregas", label: "Entregas" },
];

export function Sidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Abrir menu"
        className="fixed left-3 top-3 z-30 rounded-md bg-roxo-900 p-2 text-white md:hidden"
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <path d="M2 5h16M2 10h16M2 15h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-60 shrink-0 flex-col bg-roxo-900 text-roxo-200 transition-transform duration-200 md:static md:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="border-b border-line px-5 py-5">
          <p className="text-lg font-bold tracking-tight text-white font-display">
            Indústria 24h
          </p>
          <p className="text-xs text-muted">Painel administrativo</p>
        </div>
        <nav className="flex-1 overflow-y-auto p-3">
          {NAV.map((item) => {
            // /admin casa exato; demais casam por prefixo do segmento.
            const active =
              item.href === "/admin"
                ? pathname === "/admin"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                aria-current={active ? "page" : undefined}
                className={`mb-0.5 block rounded px-3 py-2 text-sm font-medium transition-colors border-l-[3px] ${
                  active
                    ? "bg-roxo-800 text-white border-amarelo"
                    : "text-roxo-200/80 hover:bg-roxo-800/50 hover:text-white border-l-[3px] border-transparent"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
