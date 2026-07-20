"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Menu lateral do seller, agrupado por seção (era uma lista plana de 15 itens
// sem hierarquia — difícil de escanear). Mantém os mesmos hrefs/labels do
// menu real (docs/seller-module.md), só reorganiza a apresentação.
const GRUPOS = [
  {
    titulo: "Visão geral",
    itens: [
      { href: "/seller", label: "Dashboard", icon: IconHome },
      { href: "/seller/analise-geral", label: "Análise Geral", icon: IconChart },
      { href: "/seller/reputacao", label: "Reputação", icon: IconStar },
    ],
  },
  {
    titulo: "Catálogo",
    itens: [
      { href: "/seller/produtos", label: "Produtos", icon: IconBox },
      { href: "/seller/afiliados", label: "Afiliados produtos", icon: IconUsers },
      { href: "/seller/promocoes", label: "Promoções", icon: IconTag },
      { href: "/seller/venda-futura", label: "Venda Futura", icon: IconClock },
      { href: "/seller/ads", label: "Publicidade", icon: IconTag },
    ],
  },
  {
    titulo: "Operação",
    itens: [
      { href: "/seller/centros", label: "Centro de distribuição", icon: IconWarehouse },
      { href: "/seller/rotas", label: "Rotas (logística)", icon: IconTruck },
      { href: "/seller/leiloes", label: "Leilões de compradores", icon: IconGavel },
      { href: "/seller/pedidos", label: "Pedidos", icon: IconOrders },
      { href: "/seller/parceiro-logistica", label: "Parceiro logística", icon: IconTruck },
      { href: "/seller/credito", label: "Crédito", icon: IconId },
    ],
  },
  {
    titulo: "Loja",
    itens: [
      { href: "/seller/minha-loja", label: "Minha Loja", icon: IconStore },
      // "Dados" no Bubble abre o modal de dados cadastrais; aqui é o mesmo form da loja
      { href: "/seller/minha-loja#dados", label: "Dados", icon: IconId },
    ],
  },
  {
    titulo: "Ajuda",
    itens: [
      { href: "/seller/tutoriais", label: "Tutoriais", icon: IconPlay },
      { href: "/seller/central-de-duvidas", label: "Central de Dúvidas", icon: IconHelp },
    ],
  },
] as const;

type SidebarProps = {
  mobileOpen?: boolean;
  onNavigate?: () => void;
};

export function Sidebar({ mobileOpen = false, onNavigate }: SidebarProps) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Menu do vendedor"
      className={`fixed inset-y-0 left-0 z-40 flex w-64 shrink-0 -translate-x-full flex-col overflow-y-auto bg-aco-900 text-aco-100 transition-transform duration-200 md:static md:z-auto md:translate-x-0 ${
        mobileOpen ? "translate-x-0" : ""
      }`}
    >
      <div className="px-5 py-6">
        <img src="/logo-industria24h.png" alt="Indústria 24h" className="h-7 w-auto" />
      </div>
      <div className="flex-1 space-y-5 px-2 pb-4">
        {GRUPOS.map((grupo) => (
          <div key={grupo.titulo}>
            <p className="px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-aco-100/50">
              {grupo.titulo}
            </p>
            <ul className="space-y-0.5">
              {grupo.itens.map((item) => {
                const ativo =
                  item.href === "/seller"
                    ? pathname === "/seller"
                    : pathname.startsWith(item.href.split("#")[0]);
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={ativo ? "page" : undefined}
                      onClick={onNavigate}
                      className={`flex items-center gap-2.5 rounded px-3 py-2 text-sm transition-colors border-l-[3px] ${
                        ativo
                          ? "bg-aco-600 font-semibold text-white border-sinal"
                          : "text-aco-100/80 hover:bg-aco-600 hover:text-white border-l-[3px] border-transparent"
                      }`}
                    >
                      <Icon className={ativo ? "text-sinal" : "text-aco-100/60"} />
                      <span className="truncate">{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </nav>
  );
}

// Ícones inline (sem dependência nova): stroke 1.75, 16px, herdam currentColor.
type IconProps = { className?: string };
const base = {
  viewBox: "0 0 24 24",
  width: 16,
  height: 16,
  fill: "none" as const,
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true as const,
};

function IconHome({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.5V21h14V9.5" />
    </svg>
  );
}
function IconChart({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M4 20V10M12 20V4M20 20v-7" />
    </svg>
  );
}
function IconStar({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="m12 3 2.6 5.6 6.1.6-4.6 4.1 1.3 6-5.4-3.2-5.4 3.2 1.3-6-4.6-4.1 6.1-.6Z" />
    </svg>
  );
}
function IconBox({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M21 8 12 3 3 8v8l9 5 9-5Z" />
      <path d="M3 8l9 5 9-5M12 13v8" />
    </svg>
  );
}
function IconUsers({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <circle cx="9" cy="8" r="3" />
      <path d="M2 20c0-3.3 3.1-6 7-6s7 2.7 7 6M16 4.5c1.8.4 3 2 3 3.8 0 1.8-1.2 3.3-3 3.8M18 14c2.5.5 4 2.2 4 4.5" />
    </svg>
  );
}
function IconTag({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M11 3H4v7l10 10 7-7L11 3Z" />
      <circle cx="8" cy="8" r="1.2" fill="currentColor" stroke="none" />
    </svg>
  );
}
function IconClock({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.5 2" />
    </svg>
  );
}
function IconWarehouse({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M3 21V9l4.5-3L12 9l4.5-3L21 9v12H3Z" />
      <path d="M7 21v-5h4v5M13 21v-8h4v8M3 13h18" />
    </svg>
  );
}
function IconTruck({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M3 7h11v10H3zM14 11h4l3 3v3h-7z" />
      <circle cx="7" cy="19" r="1.6" />
      <circle cx="17.5" cy="19" r="1.6" />
    </svg>
  );
}
function IconGavel({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="m14 6 4 4M5 15l4 4M9.5 10.5l4 4M3 21h8" />
      <path d="m11.5 8-3 3 4.5 4.5 3-3z" />
    </svg>
  );
}
function IconOrders({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M6 3h9l3 3v15H6z" />
      <path d="M9 10h6M9 14h6M9 18h4" />
    </svg>
  );
}
function IconStore({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M4 9V5h16v4M4 9l1.5 4.5h13L20 9M4 9v10h16V9" />
      <path d="M9 19v-5h6v5" />
    </svg>
  );
}
function IconId({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <circle cx="8.5" cy="11" r="1.8" />
      <path d="M6 16c0-1.5 1.1-2.5 2.5-2.5S11 14.5 11 16M14 9.5h5M14 13h5M14 16h3" />
    </svg>
  );
}
function IconPlay({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M10 9v6l5-3Z" fill="currentColor" stroke="none" />
    </svg>
  );
}
function IconHelp({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.8.4-1 .8-1 1.7" />
      <circle cx="12" cy="17" r="0.1" fill="currentColor" />
    </svg>
  );
}
