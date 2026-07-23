"use client";

import { useEffect } from "react";

export const REF_COOKIE = "afiliado_ref";
const DIAS = 30;

/**
 * Guarda o `?ref=` do link do afiliado num cookie para o checkout creditar a
 * comissão a quem divulgou. Sem isto o identificador nunca sai da URL e a
 * `checkout_criar_pedido` cai na regra automática (afiliação mais recente).
 */
// `ref` é prop reservada do React: passá-la de um Server Component para este
// client component derruba o render RSC ("Algo deu errado" em todo link de
// afiliado). Por isso a prop chama `refAfiliado`.
export function CapturaRef({ refAfiliado: refDoLink }: { refAfiliado?: string | null }) {
  useEffect(() => {
    if (!refDoLink) return;
    const valor = encodeURIComponent(refDoLink.slice(0, 40));
    document.cookie = `${REF_COOKIE}=${valor}; path=/; max-age=${DIAS * 24 * 60 * 60}; samesite=lax`;
  }, [refDoLink]);

  return null;
}
