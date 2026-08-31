"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";
import { TURNSTILE_ATIVO } from "@/lib/turnstile-flag";

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        options: {
          sitekey: string;
          theme?: string;
          callback?: (token: string) => void;
          "expired-callback"?: () => void;
          "error-callback"?: () => void;
        }
      ) => string;
      remove: (widgetId: string) => void;
    };
  }
}

// Widget Cloudflare Turnstile compartilhado por login, cadastro e checkout
// (achado OWASP #8). O script global só faz auto-render implícito de
// `.cf-turnstile` no carregamento completo da página — em navegação
// client-side do Next (SPA) a div nova nunca é detectada, deixando o
// widget vazio (issue #433). Por isso chamamos `turnstile.render()`
// explicitamente a cada montagem do componente.
export function TurnstileWidget({ onProntoChange }: { onProntoChange?: (pronto: boolean) => void } = {}) {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  // Serviço inativo (kill switch, ../lib/turnstile-flag): não carrega o script
  // do Cloudflare nem renderiza o widget, e libera o botão de submit na hora.
  const ativo = TURNSTILE_ATIVO && !!siteKey;
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [scriptReady, setScriptReady] = useState(false);

  useEffect(() => {
    if (!ativo) {
      onProntoChange?.(true);
      return;
    }
    if (!siteKey || !scriptReady || !containerRef.current || !window.turnstile) return;

    // Sem callback, o botão de submit fica clicável antes do desafio
    // resolver — o form envia com cf-turnstile-response vazio e o server
    // rejeita com "Verificação de segurança falhou", uma corrida real que
    // usuários rápidos disparam num primeiro clique (não um erro de conta).
    widgetIdRef.current = window.turnstile.render(containerRef.current, {
      sitekey: siteKey,
      theme: "light",
      callback: () => onProntoChange?.(true),
      "expired-callback": () => onProntoChange?.(false),
      "error-callback": () => onProntoChange?.(false),
    });
    onProntoChange?.(false);

    return () => {
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, [ativo, scriptReady, onProntoChange]);

  if (!ativo) return null;

  return (
    <>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        strategy="afterInteractive"
        onReady={() => setScriptReady(true)}
      />
      <div ref={containerRef} className="cf-turnstile" />
    </>
  );
}
