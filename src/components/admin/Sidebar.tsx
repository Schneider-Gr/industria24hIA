"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

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
  { href: "/admin/parceiros", label: "Parceiros logísticos" },
];

type SidebarProps = {
  mobileOpen?: boolean;
  onNavigate?: () => void;
};

export function Sidebar({ mobileOpen = false, onNavigate }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-40 flex w-60 shrink-0 -translate-x-full flex-col overflow-y-auto bg-roxo-900 text-roxo-200 transition-transform duration-200 md:static md:z-auto md:translate-x-0 ${
        mobileOpen ? "translate-x-0" : ""
      }`}
    >
      <div className="border-b border-line px-5 py-5">
        <img src="/logo-industria24h.png" alt="Indústria 24h" className="h-7 w-auto" />
        <p className="mt-1 text-xs text-muted">Painel administrativo</p>
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
              aria-current={active ? "page" : undefined}
              onClick={onNavigate}
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
  );
}
