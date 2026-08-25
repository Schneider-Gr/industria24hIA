"use client";

import { createContext, useContext } from "react";

// Nonce do CSP do request atual (PRD 027) — gerado no middleware, lido no
// layout raiz (server) e repassado via context até client components que
// precisam de <Script nonce={...}> (ex.: TurnstileWidget).
const NonceContext = createContext<string | undefined>(undefined);

export function NonceProvider({ nonce, children }: { nonce: string | undefined; children: React.ReactNode }) {
  return <NonceContext.Provider value={nonce}>{children}</NonceContext.Provider>;
}

export function useNonce() {
  return useContext(NonceContext);
}
