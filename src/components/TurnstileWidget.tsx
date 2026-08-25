"use client";

import Script from "next/script";

// Widget Cloudflare Turnstile compartilhado por login, cadastro e checkout
// (achado OWASP #8). O script global cria automaticamente um input oculto
// name="cf-turnstile-response" dentro da própria div — nenhum estado React
// necessário aqui, o valor já vai junto no FormData do <form> pai.
export function TurnstileWidget() {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  if (!siteKey) return null;

  return (
    <>
      <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" strategy="afterInteractive" async defer />
      <div className="cf-turnstile" data-sitekey={siteKey} data-theme="light" />
    </>
  );
}
