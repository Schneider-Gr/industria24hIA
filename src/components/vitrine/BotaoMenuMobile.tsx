"use client";

import { useState } from "react";
import { MenuMais } from "@/components/vitrine/MenuMais";

/**
 * Hambúrguer do header mobile (padrão Mercado Livre, pedido no Jam de
 * 11/09/2026): um único ponto de entrada para tudo que não cabe no topo —
 * painéis de vendedor e afiliado, pedidos, mensagens, ajuda e rodapé.
 * Reaproveita o `MenuMais`, que já espelha o desktop; a tab bar perdeu a
 * aba "Mais" para não ter dois menus com o mesmo conteúdo.
 */
export function BotaoMenuMobile() {
  const [aberto, setAberto] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setAberto(true)}
        aria-label="Abrir menu"
        aria-haspopup="dialog"
        aria-expanded={aberto}
        className="flex h-10 w-10 items-center justify-center rounded-sm text-white/90 transition-colors hover:bg-white/10 hover:text-white md:hidden"
      >
        <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" aria-hidden>
          <path d="M3 5.5h14M3 10h14M3 14.5h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      </button>
      <MenuMais aberto={aberto} aoFechar={() => setAberto(false)} />
    </>
  );
}
