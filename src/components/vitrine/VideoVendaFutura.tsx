"use client";

import { useRef, useState } from "react";

// Vídeo institucional da Venda Futura embutido do YouTube.
//
// Decisões da dona (23/09): carrega junto com a página (não espera rolagem) e
// não depende de consentimento de cookies — por isso /privacidade/cookies e a
// seção 7 da Política declaram o YouTube como cookie de terceiro.
//
// Autoplay só existe mudo: nenhum navegador deixa um vídeo começar com som sem
// toque do usuário. Então ele inicia mudo e o botão liga o som via postMessage
// da API do player (enablejsapi=1), sem carregar o SDK iframe_api.
const VIDEO_ID = "PK9QhNfOjm8";

export function VideoVendaFutura({ className = "" }: { className?: string }) {
  const [comSom, setComSom] = useState(false);
  const ref = useRef<HTMLIFrameElement>(null);

  const comando = (func: "unMute" | "mute" | "setVolume", args: unknown[] = []) => {
    ref.current?.contentWindow?.postMessage(
      JSON.stringify({ event: "command", func, args }),
      "https://www.youtube.com",
    );
  };

  const alternarSom = () => {
    if (comSom) {
      comando("mute");
    } else {
      comando("unMute");
      comando("setVolume", [100]);
    }
    setComSom((v) => !v);
  };

  const origem =
    typeof window === "undefined" ? "https://industria24.com.br" : window.location.origin;
  const src =
    `https://www.youtube.com/embed/${VIDEO_ID}` +
    `?autoplay=1&mute=1&loop=1&playlist=${VIDEO_ID}` +
    `&controls=0&modestbranding=1&rel=0&playsinline=1&disablekb=1&iv_load_policy=3&enablejsapi=1` +
    `&origin=${encodeURIComponent(origem)}`;

  return (
    <div className={`relative overflow-hidden rounded-xl bg-black ${className}`}>
      <div className="relative aspect-video w-full">
        <iframe
          ref={ref}
          src={src}
          title="Como funciona a Venda Futura na Indústria 24h"
          allow="autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
          // Sem borda: o quadro é só o vídeo.
          className="absolute inset-0 h-full w-full border-0"
        />
      </div>
      <button
        type="button"
        onClick={alternarSom}
        aria-pressed={comSom}
        className="absolute bottom-3 right-3 inline-flex items-center gap-2 rounded-full bg-black/65 px-4 py-2 text-[13px] font-bold text-white backdrop-blur-sm transition-colors hover:bg-black/80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
          <path d="M4 9v6h4l5 4V5L8 9H4z" />
          {comSom ? (
            <>
              <path d="M16.5 8.5a5 5 0 0 1 0 7" />
              <path d="M19 6a8 8 0 0 1 0 12" />
            </>
          ) : (
            <path d="M17 9.5l4 5M21 9.5l-4 5" />
          )}
        </svg>
        {comSom ? "Som ligado" : "Ativar som"}
      </button>
    </div>
  );
}
