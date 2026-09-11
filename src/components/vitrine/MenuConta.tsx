"use client";

import { useState } from "react";
import Link from "next/link";
import { sair } from "@/lib/auth-actions";
import { useSessaoUsuario } from "@/lib/useSessaoUsuario";
import { LoginModal } from "@/components/vitrine/LoginModal";

// "Meus pedidos" também tem link direto no header (AtalhoMeusPedidos, ao
// lado deste botão) — duplicado aqui a pedido do usuário, para quem entra
// pelo menu de conta em vez do atalho da barra.
const ATALHOS = [
  { href: "/meus-pedidos", label: "Meus Pedidos" },
  { href: "/mensagens", label: "Mensagens" },
] as const;

/**
 * Substitui o botão "Entrar" do header por um menu de atalhos quando já há
 * sessão — mesmo papel do dropdown de conta do Mercado Livre, mas só para
 * o comprador: painéis internos continuam usando a própria Sidebar.
 */
export function MenuConta() {
  const email = useSessaoUsuario();
  const [aberto, setAberto] = useState(false);

  // undefined = ainda carregando a sessão: mantém o espaço do botão "Entrar"
  // reservado em vez de piscar entre os dois estados.
  if (email === undefined || email === null) return <LoginModal />;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={aberto}
        title={email}
        aria-label={`Conta de ${email}`}
        className="flex h-10 w-10 items-center justify-center rounded-sm text-white/90 transition-colors hover:bg-white/10 hover:text-white md:h-auto md:w-auto md:max-w-[160px] md:px-3 md:py-1.5 md:text-[13px] md:tracking-[0.04em]"
      >
        {/* Mobile: inicial do e-mail num disco, mesmo alvo de 40px do "Entrar". */}
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/15 text-[13px] font-semibold uppercase md:hidden">
          {email[0]}
        </span>
        <span className="hidden truncate md:inline">{email.split("@")[0]}</span>
      </button>

      {aberto && (
        <>
          {/* Fecha ao clicar fora, sem precisar de listener global. */}
          <button
            type="button"
            aria-hidden="true"
            tabIndex={-1}
            onClick={() => setAberto(false)}
            className="fixed inset-0 z-[59] cursor-default"
          />
          <div
            role="menu"
            className="absolute right-0 z-[60] mt-1 w-56 rounded-md border border-line bg-white py-1.5 shadow-[0_16px_48px_rgba(15,26,36,.18)]"
          >
            {ATALHOS.map((a) => (
              <Link
                key={a.href}
                href={a.href}
                role="menuitem"
                onClick={() => setAberto(false)}
                className="block px-4 py-2 text-[13px] text-ink hover:bg-lm-cinza"
              >
                {a.label}
              </Link>
            ))}
            <form action={sair}>
              <button
                type="submit"
                role="menuitem"
                className="block w-full px-4 py-2 text-left text-[13px] text-ink hover:bg-lm-cinza"
              >
                Sair
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  );
}
