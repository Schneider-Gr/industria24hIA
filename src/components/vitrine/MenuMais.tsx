"use client";

import Link from "next/link";
import { useEffect } from "react";

type Props = { aberto: boolean; aoFechar: () => void };

// Bottom sheet da aba "Mais" da tab bar mobile (5ª aba, padrão Mercado
// Livre). "Meus Pedidos" existe desde o PRD 009 (US00, /meus-pedidos).
// "Meu Perfil" do comprador ainda não existe no rebuild Next.js (só no
// Bubble legado) — não inventar rota.
const LINKS = [
  { href: "/meus-pedidos", label: "Meus Pedidos" },
  { href: "/vender", label: "Vender no Indústria 24h" },
  { href: "/vender-como-afiliado", label: "Venda como Afiliado" },
  { href: "/login", label: "Entrar" },
] as const;

export function MenuMais({ aberto, aoFechar }: Props) {
  useEffect(() => {
    if (!aberto) return;
    function aoTeclar(e: KeyboardEvent) {
      if (e.key === "Escape") aoFechar();
    }
    document.addEventListener("keydown", aoTeclar);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", aoTeclar);
      document.body.style.overflow = "";
    };
  }, [aberto, aoFechar]);

  if (!aberto) return null;

  return (
    <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true" aria-label="Mais opções">
      <button
        type="button"
        aria-label="Fechar"
        onClick={aoFechar}
        className="absolute inset-0 bg-black/40"
      />
      <div
        className="absolute inset-x-0 bottom-0 rounded-t-xl bg-white pb-[calc(env(safe-area-inset-bottom)+12px)] shadow-2xl anim-entra"
      >
        <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-line" />
        <ul className="divide-y divide-line px-2 py-2">
          {LINKS.map((l) => (
            <li key={l.href}>
              <Link
                href={l.href}
                onClick={aoFechar}
                className="block px-3 py-3.5 text-[14px] font-medium text-ink-2 active:bg-lm-azul/5"
              >
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
