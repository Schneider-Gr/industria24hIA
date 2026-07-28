"use client";

import { useEffect } from "react";

export const REF_COOKIE = "afiliado_ref";
const DIAS = 30;

/**
 * Guarda o `?ref=` do link do afiliado num cookie para o checkout creditar a
 * comissão a quem divulgou. Sem isto o identificador nunca sai da URL e a
 * `checkout_criar_pedido` cai na regra automática (afiliação mais recente).
 *
 * Sem prop `identificador`, lê o `?ref=` da própria URL no cliente (via
 * `window.location.search`, não `useSearchParams`) — usado em páginas com
 * ISR (ex.: `/loja/[id]`) onde ler searchParams no server tornaria a rota
 * dinâmica e quebraria o revalidate.
 */
// A prop NÃO pode se chamar `ref`: é nome reservado do React — com ?ref= na
// URL a string virava "ref" de verdade e derrubava a página inteira de
// produto (erro global em prod, achado no QA ao vivo de 23/07).
export function CapturaRef({ identificador: refDoLink }: { identificador?: string | null }) {
  useEffect(() => {
    const valor = refDoLink ?? new URLSearchParams(window.location.search).get("ref");
    if (!valor) return;
    const codificado = encodeURIComponent(valor.slice(0, 40));
    document.cookie = `${REF_COOKIE}=${codificado}; path=/; max-age=${DIAS * 24 * 60 * 60}; samesite=lax`;
  }, [refDoLink]);

  return null;
}
