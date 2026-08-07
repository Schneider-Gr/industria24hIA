"use client";

import Link from "next/link";
import { useSessaoUsuario } from "@/lib/useSessaoUsuario";

/**
 * Link direto pra "Meus pedidos" na barra do header — visível sem precisar
 * abrir o dropdown de conta, equivalente ao "Compras" solto na barra do
 * Mercado Livre. Ícone só (sem rótulo) em telas estreitas pra não brigar
 * por espaço com CEP/conta/carrinho; texto completo a partir de `sm`.
 * Some quando não há sessão (mesmo gate do MenuConta).
 */
export function MinhasComprasLink() {
  const email = useSessaoUsuario();
  if (!email) return null;

  return (
    <Link
      href="/meus-pedidos"
      title="Meus pedidos"
      className="flex shrink-0 items-center gap-1.5 rounded-sm px-2 py-1.5 text-[13px] font-medium tracking-[0.04em] text-white/90 transition-colors hover:bg-white/10 hover:text-white"
    >
      <IconePedidos className="h-4 w-4 shrink-0" />
      <span className="hidden sm:inline">Meus pedidos</span>
    </Link>
  );
}

function IconePedidos({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden>
      <path
        d="M4 6.5 10 3l6 3.5M4 6.5v7L10 17l6-3.5v-7M4 6.5 10 10l6-3.5M10 10v7"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
