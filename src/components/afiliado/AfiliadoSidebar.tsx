"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Sidebar do afiliado no padrão dos demais painéis (Aço & Sinal): fundo
// aco-900, item ativo em aco-800 com barra sinal de 3px à esquerda.
const ITENS = [
  { href: "/afiliado", label: "Meu desempenho", icon: IconChart },
  { href: "/afiliado/solicitar", label: "Solicitar afiliação", icon: IconPlus },
  { href: "/afiliado/logistica", label: "Entregas (logística)", icon: IconTruck },
] as const;

export function AfiliadoSidebar({
  mobileOpen = false,
  onNavigate,
}: {
  mobileOpen?: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  return (
    <aside
      aria-label="Menu do afiliado"
      className={`fixed inset-y-0 left-0 z-40 flex w-[190px] shrink-0 -translate-x-full flex-col bg-aco-900 transition-transform duration-200 md:static md:z-auto md:translate-x-0 ${
        mobileOpen ? "translate-x-0" : ""
      }`}
    >
      <div className="border-b border-aco-800 px-4 py-4">
        <img src="/logo-industria24h.png" alt="Indústria 24h" className="h-6 w-auto" />
        <p className="mt-1.5 text-[11px] tracking-[0.04em] text-white/55">
          Painel do afiliado
        </p>
      </div>

      <nav className="flex-1 py-2">
        {ITENS.map((item) => {
          const ativo =
            item.href === "/afiliado"
              ? pathname === "/afiliado"
              : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              aria-current={ativo ? "page" : undefined}
              className={`flex items-center gap-2 border-l-[3px] px-3.5 py-2.5 text-xs tracking-[0.04em] transition-colors ${
                ativo
                  ? "border-sinal bg-aco-800 text-white"
                  : "border-transparent text-white/65 hover:bg-aco-800 hover:text-white"
              }`}
            >
              <Icon />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-aco-800 px-3.5 py-3">
        <Link
          href="/"
          className="flex items-center gap-1.5 text-[11px] tracking-[0.04em] text-white/65 hover:text-white"
        >
          <IconVoltar />
          Voltar à vitrine
        </Link>
      </div>
    </aside>
  );
}

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

function IconChart() {
  return (
    <svg {...svg}>
      <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
    </svg>
  );
}

function IconPlus() {
  return (
    <svg {...svg}>
      <path d="M12 5v14M5 12h14" />
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

function IconVoltar() {
  return (
    <svg {...svg}>
      <path d="M19 12H5M11 18l-6-6 6-6" />
    </svg>
  );
}
