"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCarrinho } from "@/components/carrinho/carrinho";
import { temTabBar } from "@/components/vitrine/rotas-tabbar";
import { IconeCupom, IconePedidos } from "@/components/vitrine/icones-menu";

// Tab bar fixa mobile-only, 5 abas de peso igual (decisão da dona em
// 11/09/2026 sobre o benchmark do Zé Delivery, change
// mobile-vitrine-densa-benchmark): Início · Buscar · Cupons · Carrinho ·
// Pedidos. Categorias saiu da tab bar e virou o chip fixo "Categorias" da
// home (bottom sheet). Paleta lm-* (DESIGN.md). Escondida nas áreas que já
// têm chrome própria (ver rotas-tabbar.ts).
//
// Nenhuma aba é atendimento: já foi "Ajuda" chamando abrirAtendimento(), a
// mesma ação do FAB do ChatWidget logo acima — dois caminhos idênticos
// encostados. Atendimento é ação flutuante, não destino de navegação (#584).

export function TabBarMobile() {
  const pathname = usePathname();
  const { itens } = useCarrinho();
  const totalCarrinho = itens.reduce((s, i) => s + i.quantidade, 0);
  if (!temTabBar(pathname)) return null;

  const ABAS = [
    { href: "/", label: "Início", icone: IconeInicio },
    { href: "/busca", label: "Buscar", icone: IconeBuscar },
    {
      href: "/cupons",
      label: "Cupons",
      // IconeCupom/IconePedidos vêm do menu (mesmo traço 1.6) e só aceitam
      // className; o wrapper existe porque a tab bar passa `ativo` a todo ícone.
      icone: ({ className }: IconeProps) => <IconeCupom className={className} />,
    },
    { href: "/carrinho", label: "Carrinho", icone: IconeCarrinho, badge: totalCarrinho },
    {
      href: "/meus-pedidos",
      label: "Pedidos",
      icone: ({ className }: IconeProps) => <IconePedidos className={className} />,
    },
  ];

  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 bottom-0 z-40 flex border-t border-lm-marinho/20 bg-lm-marinho md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {ABAS.map((aba) => {
        const ativo = aba.href === "/" ? pathname === "/" : pathname.startsWith(aba.href);
        const Icone = aba.icone;
        return (
          <Link
            key={aba.label}
            href={aba.href}
            aria-current={ativo ? "page" : undefined}
            className={`flex min-h-11 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[10px] tracking-[0.02em] ${
              ativo ? "text-lm-amarelo" : "text-white/60"
            }`}
          >
            <span className="relative">
              <Icone className="h-5 w-5" ativo={ativo} />
              {"badge" in aba && (aba.badge ?? 0) > 0 && (
                <span className="absolute -right-1.5 -top-1.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-lm-vermelho px-0.5 text-[9px] font-bold leading-none text-white">
                  {aba.badge}
                </span>
              )}
            </span>
            <span className="max-w-full truncate px-0.5">{aba.label}</span>
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

function IconeBuscar({ className }: IconeProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden>
      <circle cx="9" cy="9" r="5.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="m13.2 13.2 3.8 3.8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
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
