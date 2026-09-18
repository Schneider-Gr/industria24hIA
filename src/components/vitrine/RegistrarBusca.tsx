"use client";

import { useEffect } from "react";
import { lerConsentimento } from "@/components/CookieAviso";
import {
  HISTORICO_BUSCA_COOKIE,
  HISTORICO_MAX_AGE,
  lerHistorico,
  registrarTermo,
} from "@/lib/catalogo-compra/vitrine-personalizacao";

// Grava o termo buscado no histórico só com consentimento "todos" (LGPD).
export function RegistrarBusca({ termo }: { termo: string }) {
  useEffect(() => {
    if (!termo || lerConsentimento() !== "todos") return;
    const atual = document.cookie.match(new RegExp(`(?:^|; )${HISTORICO_BUSCA_COOKIE}=([^;]*)`))?.[1];
    const novo = registrarTermo(lerHistorico(atual), termo);
    document.cookie = `${HISTORICO_BUSCA_COOKIE}=${encodeURIComponent(JSON.stringify(novo))}; path=/; max-age=${HISTORICO_MAX_AGE}; samesite=lax`;
  }, [termo]);
  return null;
}
