"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

declare global {
  interface Window {
    fbq?: ((...args: unknown[]) => void) & { callMethod?: (...args: unknown[]) => void };
    _fbq?: unknown;
  }
}

// Pixel da Meta (conjunto de dados "industria24h-web" do Gerenciador de
// Eventos da conta 427695086685368). O ID não é segredo — ele vai no HTML
// servido a qualquer visitante —, então fica aqui como constante em vez de
// env: na Vercel uma env ausente ou vazia viraria pixel silenciosamente morto,
// sem erro de build e sem evento no painel.
export const META_PIXEL_ID = "2023211978366883";

// Carrega o pixel e dispara PageView. Só é montado na landing de captação de
// seller (/venda-no-industria) — é de lá que sai o público de retargeting da
// campanha. O snippet oficial roda inline, o que exige 'unsafe-inline' em
// script-src: vale nas rotas públicas (variante padrão do CSP em proxy.ts),
// NÃO nos painéis, que rodam a variante estrita com nonce.
export function MetaPixel() {
  const pathname = usePathname();
  // O snippet já dispara o primeiro PageView. Sem esta trava a navegação
  // client-side do Next contaria a landing duas vezes na entrada.
  const primeiroRender = useRef(true);

  useEffect(() => {
    if (primeiroRender.current) {
      primeiroRender.current = false;
      return;
    }
    window.fbq?.("track", "PageView");
  }, [pathname]);

  return (
    <>
      <Script id="meta-pixel" strategy="afterInteractive">
        {`!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window,document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init','${META_PIXEL_ID}');
fbq('track','PageView');`}
      </Script>
      {/* Fallback do snippet oficial para visitante sem JS. É esta tag que
          exige www.facebook.com em img-src no CSP (proxy.ts). */}
      <noscript>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          height="1"
          width="1"
          style={{ display: "none" }}
          alt=""
          src={`https://www.facebook.com/tr?id=${META_PIXEL_ID}&ev=PageView&noscript=1`}
        />
      </noscript>
    </>
  );
}
