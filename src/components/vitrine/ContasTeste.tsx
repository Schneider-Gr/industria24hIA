"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * TODO(fase-de-testes): remover antes do lançamento público — contas de
 * demonstração do MVP, pedido do dono em 2026-07-13. Mesmas credenciais que
 * já estavam listadas em /login, agora com atalho de entrada por módulo.
 */
const SENHA_TESTE = "Teste-i24h-2026!";

const CONTAS = [
  { modulo: "Admin", email: "admin-teste-i24@example.com", destino: "/admin" },
  { modulo: "Seller (loja)", email: "seller-teste-i24@example.com", destino: "/seller" },
  { modulo: "Comprador", email: "comprador-teste-i24@example.com", destino: "/" },
  { modulo: "Afiliado (vendas)", email: "afiliado-teste-i24@example.com", destino: "/afiliado" },
  { modulo: "Parceiro logístico 1", email: "parceiro1-teste-i24@example.com", destino: "/parceiro" },
  { modulo: "Parceiro logístico 2", email: "parceiro2-teste-i24@example.com", destino: "/parceiro" },
];

export function ContasTeste({ aoEntrar }: { aoEntrar?: () => void }) {
  const router = useRouter();
  const [entrando, setEntrando] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  async function entrarComo(email: string, destino: string) {
    setErro(null);
    setEntrando(email);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: SENHA_TESTE,
    });
    setEntrando(null);
    if (error) {
      setErro("Não foi possível entrar com esta conta de teste.");
      return;
    }
    aoEntrar?.();
    router.push(destino);
    router.refresh();
  }

  return (
    <div>
      <p className="mb-3 rounded-sm bg-yellow-100 px-2 py-1.5 text-[11px] leading-snug text-yellow-800">
        Ambiente de testes. Estas contas são públicas e devem sair antes do
        lançamento.
      </p>

      {erro && (
        <p role="alert" className="mb-2 rounded-sm border border-red-700 bg-red-50 p-2 text-[11px] text-red-700">
          {erro}
        </p>
      )}

      <ul className="space-y-1.5">
        {CONTAS.map((c) => (
          <li key={c.email}>
            <button
              type="button"
              disabled={entrando !== null}
              onClick={() => entrarComo(c.email, c.destino)}
              className="flex w-full items-center justify-between gap-2 rounded-sm border border-line bg-surface px-2.5 py-2 text-left transition-colors hover:border-lm-azul disabled:opacity-50"
            >
              <span>
                <span className="block text-[13px] font-medium text-ink">{c.modulo}</span>
                <span className="block text-[11px] text-muted">{c.email}</span>
              </span>
              <span className="shrink-0 text-[11px] font-semibold text-lm-azul">
                {entrando === c.email ? "entrando…" : "entrar"}
              </span>
            </button>
          </li>
        ))}
      </ul>

      <p className="mt-3 text-[11px] text-muted">
        Senha (todas): <code>{SENHA_TESTE}</code>
      </p>
    </div>
  );
}
