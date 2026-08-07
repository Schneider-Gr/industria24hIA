"use client";

import Link from "next/link";
import { useSessaoUsuario } from "@/lib/useSessaoUsuario";

// Chip "Meus Pedidos" na barra do topo (junto de Ofertas/Venda Futura/
// Compras coletivas) — antes só existia dentro do dropdown de conta,
// pouco descoberto. Só aparece com sessão ativa (mesmo hook do MenuConta).
export function AtalhoMeusPedidos() {
  const email = useSessaoUsuario();
  if (!email) return null;

  return (
    <Link
      href="/meus-pedidos"
      className="shrink-0 rounded-full bg-white/10 px-3.5 py-1.5 text-[12.5px] font-semibold text-white/85 transition-colors hover:bg-white/20 hover:text-white"
    >
      Meus Pedidos
    </Link>
  );
}
