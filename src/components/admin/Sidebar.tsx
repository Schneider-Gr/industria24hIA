"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Menu admin espelhando a UI real do Bubble (docs/admin-module.md), agrupado
// por natureza da tarefa — eram 13 itens numa lista plana, sem hierarquia.
// Ícones em SVG inline (mesmo padrão de seller/afiliado): o projeto não usa
// biblioteca de ícones e não vale uma dependência nova por 13 glifos.
const GRUPOS = [
  {
    titulo: "Visão",
    itens: [
      { href: "/admin", label: "Dashboard", icon: IconDashboard },
      { href: "/admin/analise-geral", label: "Análise Geral", icon: IconChart },
    ],
  },
  {
    titulo: "Curadoria",
    itens: [
      { href: "/admin/lojas", label: "Lojas", icon: IconStore },
      { href: "/admin/produtos", label: "Produtos", icon: IconPackage },
      { href: "/admin/afiliados", label: "Afiliados", icon: IconAffiliate },
      { href: "/admin/usuarios", label: "Usuários", icon: IconUsers },
      { href: "/admin/auditoria", label: "Auditoria", icon: IconUsers },
      { href: "/admin/perfil/seguranca", label: "Segurança (2FA)", icon: IconUsers },
    ],
  },
  {
    titulo: "Comercial",
    itens: [
      { href: "/admin/pedidos", label: "Pedidos", icon: IconReceipt },
      { href: "/admin/disputas", label: "Disputas", icon: IconReceipt },
      { href: "/admin/repasses", label: "Repasses", icon: IconReceipt },
      { href: "/admin/entregas", label: "Entregas", icon: IconTruck },
      { href: "/admin/lotes", label: "Lotes de rota", icon: IconTruck },
      { href: "/admin/parceiros", label: "Parceiros logísticos", icon: IconTruck },
      { href: "/admin/promocoes", label: "Promoções", icon: IconDiscount },
      { href: "/admin/galerias", label: "Galerias", icon: IconCategory },
      { href: "/admin/coletivas", label: "Compras coletivas", icon: IconUsers },
      { href: "/admin/leads", label: "Leads (bot)", icon: IconUsers },
    ],
  },
  {
    titulo: "Configuração",
    itens: [
      { href: "/admin/categorias", label: "Categorias", icon: IconCategory },
      { href: "/admin/destaques", label: "Destaques da Indústria", icon: IconImage },
      { href: "/admin/editar-marketplace", label: "Editar Marketplace", icon: IconAdjust },
      { href: "/admin/paginas", label: "Páginas", icon: IconFile },
    ],
  },
] as const;

type SidebarProps = {
  mobileOpen?: boolean;
  onNavigate?: () => void;
  badges?: Record<string, number>;
};

export function Sidebar({ mobileOpen = false, onNavigate, badges }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-40 flex w-60 shrink-0 -translate-x-full flex-col overflow-y-auto bg-aco-900 text-white/70 transition-transform duration-200 md:static md:z-auto md:translate-x-0 ${
        mobileOpen ? "translate-x-0" : ""
      }`}
    >
      <div className="border-b border-aco-800 px-5 py-5">
        <img src="/logo-industria24h.png" alt="Indústria 24h" className="h-7 w-auto" />
        <p className="mt-1 text-xs tracking-[0.04em] text-white/55">Painel administrativo</p>
      </div>
      <nav className="flex-1 overflow-y-auto p-3">
        {GRUPOS.map((grupo) => (
          <div key={grupo.titulo} className="mb-3">
            <p className="px-3 pb-1 text-[10px] uppercase tracking-[0.1em] text-white/38">
              {grupo.titulo}
            </p>
            {grupo.itens.map((item) => {
              // /admin casa exato; demais casam por prefixo do segmento.
              const active =
                item.href === "/admin"
                  ? pathname === "/admin"
                  : pathname.startsWith(item.href);
              const pendencias = badges?.[item.href] ?? 0;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  onClick={onNavigate}
                  className={`mb-0.5 flex items-center gap-2 rounded border-l-[3px] px-3 py-2 text-[13px] tracking-[0.04em] transition-colors ${
                    active
                      ? "border-sinal bg-aco-800 text-white"
                      : "border-transparent text-white/65 hover:bg-aco-800/60 hover:text-white"
                  }`}
                >
                  <Icon />
                  <span className="truncate">{item.label}</span>
                  {pendencias > 0 && (
                    <span className="num ml-auto rounded-sm bg-sinal px-1.5 py-0.5 text-[10px] font-bold text-white">
                      {pendencias}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
    </aside>
  );
}

// Ícones inline (stroke 1.75, 16px, herdam currentColor) — equivalentes aos
// Tabler outline pedidos no brief, sem adicionar dependência.
const svg = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  className: "h-4 w-4 shrink-0",
  "aria-hidden": true,
};

function IconDashboard() {
  return (
    <svg {...svg}>
      <rect x="3" y="3" width="7" height="9" rx="1" />
      <rect x="14" y="3" width="7" height="5" rx="1" />
      <rect x="14" y="12" width="7" height="9" rx="1" />
      <rect x="3" y="16" width="7" height="5" rx="1" />
    </svg>
  );
}

function IconChart() {
  return (
    <svg {...svg}>
      <path d="M4 19V5M4 19h16M8 15l3-4 3 3 5-6" />
    </svg>
  );
}

function IconStore() {
  return (
    <svg {...svg}>
      <path d="M4 9h16v11H4zM3 9l1.5-5h15L21 9M9 20v-6h6v6" />
    </svg>
  );
}

function IconPackage() {
  return (
    <svg {...svg}>
      <path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3zM4 7.5l8 4.5 8-4.5M12 12v9" />
    </svg>
  );
}

function IconAffiliate() {
  return (
    <svg {...svg}>
      <circle cx="6" cy="7" r="2.5" />
      <circle cx="18" cy="7" r="2.5" />
      <circle cx="12" cy="18" r="2.5" />
      <path d="M8 8.5l3 7M16 8.5l-3 7" />
    </svg>
  );
}

function IconUsers() {
  return (
    <svg {...svg}>
      <circle cx="9" cy="8" r="3" />
      <path d="M3 20a6 6 0 0 1 12 0M16 5.5a3 3 0 0 1 0 5M17 20a5 5 0 0 0-2-4" />
    </svg>
  );
}

function IconReceipt() {
  return (
    <svg {...svg}>
      <path d="M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6" />
    </svg>
  );
}

function IconTruck() {
  return (
    <svg {...svg}>
      <path d="M3 16V6h11v10M14 9h4l3 3v4h-7" />
      <circle cx="7.5" cy="17.5" r="1.8" />
      <circle cx="17.5" cy="17.5" r="1.8" />
    </svg>
  );
}

function IconDiscount() {
  return (
    <svg {...svg}>
      <path d="M9 15l6-6" />
      <circle cx="9.5" cy="9.5" r="1.5" />
      <circle cx="14.5" cy="14.5" r="1.5" />
      <path d="M4 12l2-5 5-2 5 2 2 5-2 5-5 2-5-2-2-5z" />
    </svg>
  );
}

function IconCategory() {
  return (
    <svg {...svg}>
      <rect x="4" y="4" width="6" height="6" rx="1" />
      <rect x="14" y="4" width="6" height="6" rx="1" />
      <rect x="4" y="14" width="6" height="6" rx="1" />
      <rect x="14" y="14" width="6" height="6" rx="1" />
    </svg>
  );
}

function IconAdjust() {
  return (
    <svg {...svg}>
      <path d="M4 6h16M4 12h16M4 18h16" />
      <circle cx="9" cy="6" r="2" />
      <circle cx="15" cy="12" r="2" />
      <circle cx="8" cy="18" r="2" />
    </svg>
  );
}

function IconImage() {
  return (
    <svg {...svg}>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <circle cx="8.5" cy="9.5" r="1.75" />
      <path d="M4 17l5-5 4 4 3-3 4 4" />
    </svg>
  );
}

function IconFile() {
  return (
    <svg {...svg}>
      <path d="M14 3H7a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V7l-4-4z" />
      <path d="M14 3v4h4M9 12h6M9 16h6" />
    </svg>
  );
}
