"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

// Menu lateral fixo do seller. Espelha o menu do painel real (docs/seller-module.md).
const ITENS = [
  { href: "/seller", label: "Dashboard" },
  { href: "/seller/analise-geral", label: "Análise Geral" },
  { href: "/seller/produtos", label: "Produtos" },
  { href: "/seller/afiliados", label: "Afiliados produtos" },
  { href: "/seller/centros", label: "Centro de distribuição" },
  { href: "/seller/promocoes", label: "Promoções" },
  { href: "/seller/venda-futura", label: "Venda Futura" },
  { href: "/seller/pedidos", label: "Pedidos" },
  { href: "/seller/minha-loja", label: "Minha Loja" },
] as const;

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
      <nav
        aria-label="Menu do vendedor"
        className={`fixed inset-y-0 left-0 z-40 flex w-60 shrink-0 flex-col bg-roxo-900 text-roxo-200 transition-transform duration-200 md:static md:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="px-5 py-6 text-lg font-semibold text-white font-display">
          Indústria 24h
        </div>
        <ul className="flex-1 space-y-1 px-2">
          {ITENS.map((item) => {
            const ativo =
              item.href === "/seller"
                ? pathname === "/seller"
                : pathname.startsWith(item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => setOpen(false)}
                  aria-current={ativo ? "page" : undefined}
                  className={`block rounded px-3 py-2 text-sm transition-colors border-l-[3px] ${
                    ativo
                      ? "bg-roxo-800 font-semibold text-white border-amarelo"
                      : "text-roxo-200/80 hover:bg-roxo-800 hover:text-white border-l-[3px] border-transparent"
                  }`}
                >
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
