"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { useCarrinho } from "@/components/carrinho/carrinho";
import { MenuMais } from "@/components/vitrine/MenuMais";

// Tab bar fixa mobile-only, 5 abas de peso igual (padrão Mercado Livre:
// destino de primeiro nível, não menu aninhado). Paleta lm-* (DESIGN.md
// 2026-07-29, oficial). Escondida nas áreas que já têm chrome própria
// (admin/seller/afiliado) para não duplicar navegação.
const ROTAS_SEM_TABBAR = ["/admin", "/seller", "/afiliado"];

export function TabBarMobile() {
  const pathname = usePathname();
  const router = useRouter();
  const { itens } = useCarrinho();
  const [menuAberto, setMenuAberto] = useState(false);
  const totalCarrinho = itens.reduce((s, i) => s + i.quantidade, 0);
  if (ROTAS_SEM_TABBAR.some((rota) => pathname.startsWith(rota))) return null;

  function irParaOfertas() {
    if (pathname === "/") {
      document.getElementById("ofertas")?.scrollIntoView({ behavior: "smooth" });
    } else {
      router.push("/#ofertas");
    }
  }

  const ABAS = [
    { tipo: "link" as const, href: "/", label: "Início", icone: IconeInicio },
    { tipo: "link" as const, href: "/categoria", label: "Categorias", icone: IconeCategorias },
    { tipo: "link" as const, href: "/carrinho", label: "Carrinho", icone: IconeCarrinho, badge: totalCarrinho },
    { tipo: "acao" as const, acao: irParaOfertas, label: "Ofertas", icone: IconeOfertas },
    { tipo: "acao" as const, acao: () => setMenuAberto(true), label: "Mais", icone: IconeMais },
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
              {aba.label}
            </>
          );
          const classe = `flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] tracking-[0.02em] ${
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
      <MenuMais aberto={menuAberto} aoFechar={() => setMenuAberto(false)} />
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

function IconeOfertas({ className }: IconeProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden>
      <path
        d="M3 10.5V5a2 2 0 0 1 2-2h5.5a2 2 0 0 1 1.4.6l5 5a2 2 0 0 1 0 2.8l-5.6 5.6a2 2 0 0 1-2.8 0l-5-5A2 2 0 0 1 3 10.5Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <circle cx="7" cy="7" r="1.1" fill="currentColor" />
    </svg>
  );
}

function IconeMais({ className }: IconeProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden>
      <circle cx="4" cy="10" r="1.4" fill="currentColor" />
      <circle cx="10" cy="10" r="1.4" fill="currentColor" />
      <circle cx="16" cy="10" r="1.4" fill="currentColor" />
    </svg>
  );
}
