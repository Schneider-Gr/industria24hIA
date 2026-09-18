"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import {
  CONSENTIMENTO_COOKIE,
  HISTORICO_BUSCA_COOKIE,
  HISTORICO_MAX_AGE,
  type Consentimento,
} from "@/lib/catalogo-compra/vitrine-personalizacao";

export function lerConsentimento(): Consentimento | null {
  const m = document.cookie.match(new RegExp(`(?:^|; )${CONSENTIMENTO_COOKIE}=([^;]*)`));
  return m?.[1] === "todos" || m?.[1] === "essenciais" ? m[1] : null;
}

// Quem mostra a escolha (aviso, página de preferências) re-renderiza quando
// ela muda. "desconhecido" = render do servidor, que não lê cookie aqui.
const ouvintes = new Set<() => void>();
function assinar(f: () => void) {
  ouvintes.add(f);
  return () => {
    ouvintes.delete(f);
  };
}
export function useConsentimento(): Consentimento | null | "desconhecido" {
  return useSyncExternalStore(assinar, lerConsentimento, () => "desconhecido");
}

export function gravarConsentimento(valor: Consentimento) {
  // 1 ano, prazo declarado em /privacidade/cookies.
  document.cookie = `${CONSENTIMENTO_COOKIE}=${valor}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
  if (valor === "essenciais") apagarHistoricoBusca();
  ouvintes.forEach((f) => f());
}

export function apagarHistoricoBusca() {
  document.cookie = `${HISTORICO_BUSCA_COOKIE}=; path=/; max-age=0; samesite=lax`;
}

export { HISTORICO_MAX_AGE };

// Aviso de cookies (LGPD): aparece até o visitante escolher. "Aceitar todos"
// libera o histórico de busca que personaliza a vitrine; "Só essenciais"
// mantém CEP, carrinho e login, que o site precisa para funcionar.
export function CookieAviso() {
  const consentimento = useConsentimento();
  if (consentimento !== null) return null;

  const escolher = (valor: Consentimento) => gravarConsentimento(valor);

  return (
    <div
      role="region"
      aria-label="Aviso de cookies"
      className="fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-50 px-3 pb-3 md:bottom-0 md:pb-[calc(1rem+env(safe-area-inset-bottom))]"
    >
      <div className="mx-auto flex max-w-[1080px] flex-col gap-3 rounded-lg border border-line bg-surface p-4 shadow-[0_8px_28px_rgba(15,26,36,.18)] md:flex-row md:items-center md:gap-6">
        <p className="text-[13px] leading-snug text-ink">
          Usamos cookies essenciais para o CEP, o carrinho e o login. Com a sua permissão, guardamos também suas
          últimas buscas por 90 dias para mostrar produtos do seu interesse, e medimos visitas para anúncios.{" "}
          <Link href="/privacidade/cookies" className="font-semibold text-lm-azul underline underline-offset-2">
            Saiba mais
          </Link>
        </p>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={() => escolher("essenciais")}
            className="rounded-md border border-line px-4 py-2 text-[13px] font-semibold text-ink hover:border-lm-azul"
          >
            Só essenciais
          </button>
          <button
            type="button"
            onClick={() => escolher("todos")}
            className="rounded-md bg-lm-azul px-4 py-2 text-[13px] font-semibold text-white hover:bg-lm-azul-escuro"
          >
            Aceitar todos
          </button>
        </div>
      </div>
    </div>
  );
}
