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
      className="flex w-60 shrink-0 flex-col bg-roxo-900 text-roxo-200"
    >
      <div className="px-5 py-6">
        <img src="/logo-industria24h.png" alt="Indústria 24h" className="h-7 w-auto" />
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
  );
}
