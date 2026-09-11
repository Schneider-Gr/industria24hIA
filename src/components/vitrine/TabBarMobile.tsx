"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCarrinho } from "@/components/carrinho/carrinho";
import { abrirAtendimento } from "@/components/bot/abrirAtendimento";
import { temTabBar } from "@/components/vitrine/rotas-tabbar";

// Tab bar fixa mobile-only, 4 abas de peso igual (padrão Mercado Livre:
// destino de primeiro nível, não menu aninhado). Paleta lm-* (DESIGN.md
// 2026-07-29, oficial). Escondida nas áreas que já têm chrome própria
// (ver rotas-tabbar.ts) para não duplicar navegação.
//
// A aba "Mais" virou o hambúrguer do header (Jam de 11/09/2026, padrão
// Mercado Livre): um menu só, no topo, em vez de dois pontos de entrada
// para o mesmo conteúdo.
//
// "Atendimento" ocupa a 4ª aba no lugar de "Ofertas" (que virou item do
// menu Mais): o botão flutuante do ChatWidget disputava o mesmo canto com a
// barra de compra fixa de /produto/[id] e com o card de CEP, então no
// mobile o atendimento passa a morar aqui, onde nada o cobre.

export function TabBarMobile() {
  const pathname = usePathname();
  const { itens } = useCarrinho();
  const totalCarrinho = itens.reduce((s, i) => s + i.quantidade, 0);
  if (!temTabBar(pathname)) return null;

  const ABAS = [
    { tipo: "link" as const, href: "/", label: "Início", icone: IconeInicio },
    { tipo: "link" as const, href: "/categoria", label: "Categorias", icone: IconeCategorias },
    { tipo: "link" as const, href: "/carrinho", label: "Carrinho", icone: IconeCarrinho, badge: totalCarrinho },
    { tipo: "acao" as const, acao: () => abrirAtendimento(), label: "Ajuda", icone: IconeAtendimento },
  ];

  return (
    <>
      <nav
        aria-label="Navegação principal"
        className="fixed inset-x-0 bottom-0 z-40 flex border-t border-lm-marinho/20 bg-lm-marinho md:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {ABAS.map((aba) => {
          const ativo = aba.tipo === "link" && (aba.href === "/" ? pathname === "/" : pathname.startsWith(aba.href));
          const Icone = aba.icone;
          const conteudo = (
            <>
              <span className="relative">
                <Icone className="h-5 w-5" ativo={ativo} />
                {"badge" in aba && (aba.badge ?? 0) > 0 && (
                  <span className="absolute -right-1.5 -top-1.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-lm-vermelho px-0.5 text-[9px] font-bold leading-none text-white">
                    {aba.badge}
                  </span>
                )}
              </span>
              <span className="max-w-full truncate px-0.5">{aba.label}</span>
            </>
          );
          const classe = `flex min-w-0 flex-1 flex-col items-center gap-0.5 py-2 text-[10px] tracking-[0.02em] ${
            ativo ? "text-lm-amarelo" : "text-white/60"
          }`;
          return aba.tipo === "link" ? (
            <Link key={aba.label} href={aba.href} className={classe}>
              {conteudo}
            </Link>
          ) : (
            <button key={aba.label} type="button" onClick={aba.acao} className={classe}>
              {conteudo}
            </button>
          );
        })}
      </nav>
    </>
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

function IconeCategorias({ className }: IconeProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden>
      <rect x="3" y="3" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.6" />
      <rect x="11" y="3" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.6" />
      <rect x="3" y="11" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.6" />
      <rect x="11" y="11" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.6" />
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

function IconeAtendimento({ className }: IconeProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden>
      <path
        d="M17 10.5a6.5 6.5 0 0 1-8.8 6.1L4 17.5l1.1-4A6.5 6.5 0 1 1 17 10.5Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

