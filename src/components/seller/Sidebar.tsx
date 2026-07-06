"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

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

  return (
    <nav
      aria-label="Menu do vendedor"
      className="flex w-60 shrink-0 flex-col bg-neutral-900 text-neutral-200"
    >
      <div className="px-5 py-6 text-lg font-semibold text-white">
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
                aria-current={ativo ? "page" : undefined}
                className={`block rounded-md px-3 py-2 text-sm transition-colors ${
                  ativo
                    ? "bg-neutral-700 font-medium text-white"
                    : "text-neutral-300 hover:bg-neutral-800 hover:text-white"
                }`}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
