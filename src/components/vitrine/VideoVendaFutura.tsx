"use client";

import { useEffect, useRef, useState } from "react";

// Vídeo institucional da Venda Futura embutido do YouTube.
//
// Capa primeiro, player depois: a moldura carrega só a miniatura (uns 20 KB)
// e troca pelo iframe quando a seção entra na tela. Medição de 23/09: o
// player custava ~500 KB de terceiros em TODA visita à home, inclusive de
// quem nunca rolava até aqui. O início automático continua — quem chega na
// seção vê o vídeo começar sozinho.
//
// Autoplay só existe mudo: nenhum navegador deixa um vídeo começar com som
// sem gesto do usuário — forçar `mute=0` faz o play ser bloqueado e o quadro
// fica parado. Então ele inicia mudo e o som entra sozinho no PRIMEIRO gesto
// da pessoa na página (toque, clique, tecla ou rolagem), que é o que o
// navegador aceita. O botão continua, para desligar ou religar.
const VIDEO_ID = "PK9QhNfOjm8";
const CAPA = `https://i.ytimg.com/vi/${VIDEO_ID}/hqdefault.jpg`;

export function VideoVendaFutura({ className = "" }: { className?: string }) {
  const [ativo, setAtivo] = useState(false);
  const [comSom, setComSom] = useState(false);
  const caixa = useRef<HTMLDivElement>(null);
  const iframe = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const el = caixa.current;
    if (!el || ativo) return;
    // Sem IntersectionObserver (navegador antigo), carrega no próximo tique.
    if (!("IntersectionObserver" in window)) {
      const t = globalThis.setTimeout(() => setAtivo(true), 0);
      return () => globalThis.clearTimeout(t);
    }
    const obs = new IntersectionObserver(
      (entradas) => {
        if (entradas.some((e) => e.isIntersecting)) {
          setAtivo(true);
          obs.disconnect();
        }
      },
      // Antecipa meia tela: o player já está pronto quando a seção aparece.
      { rootMargin: "50% 0px" },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [ativo]);

  const comando = (func: "unMute" | "mute" | "setVolume" | "playVideo", args: unknown[] = []) => {
    iframe.current?.contentWindow?.postMessage(
      JSON.stringify({ event: "command", func, args }),
      "https://www.youtube.com",
    );
  };

  const alternarSom = () => {
    if (!ativo) {
      // Antes do player existir, o toque no botão já liga o vídeo.
      setAtivo(true);
      setComSom(true);
      return;
    }
    if (comSom) {
      comando("mute");
    } else {
      comando("unMute");
      comando("setVolume", [100]);
      comando("playVideo");
    }
    setComSom((v) => !v);
  };

  // Som no primeiro gesto do usuário (pedido da dona, 24/09). Antes disso o
  // navegador recusa, e o vídeo pararia em vez de tocar.
  useEffect(() => {
    if (!ativo || comSom) return;
    const ligar = () => {
      comando("unMute");
      comando("setVolume", [100]);
      // O YouTube pausa ao sair do mudo sem gesto dentro do iframe; o play
      // logo em seguida mantém o vídeo rodando (visto em prod, 24/09).
      comando("playVideo");
      setComSom(true);
    };
    const opc = { once: true, passive: true } as const;
    window.addEventListener("pointerdown", ligar, opc);
    window.addEventListener("keydown", ligar, opc);
    window.addEventListener("touchstart", ligar, opc);
    window.addEventListener("scroll", ligar, opc);
    return () => {
      window.removeEventListener("pointerdown", ligar);
      window.removeEventListener("keydown", ligar);
      window.removeEventListener("touchstart", ligar);
      window.removeEventListener("scroll", ligar);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ativo, comSom]);

  const origem =
    typeof window === "undefined" ? "https://industria24.com.br" : window.location.origin;
  const src =
    `https://www.youtube.com/embed/${VIDEO_ID}` +
    `?autoplay=1&mute=${comSom ? 0 : 1}&loop=1&playlist=${VIDEO_ID}` +
    `&controls=0&modestbranding=1&rel=0&playsinline=1&disablekb=1&iv_load_policy=3&enablejsapi=1` +
    `&origin=${encodeURIComponent(origem)}`;

  return (
    <div ref={caixa} className={`relative overflow-hidden rounded-xl bg-black ${className}`}>
      <div className="relative aspect-video w-full">
        {ativo ? (
          <iframe
            ref={iframe}
            src={src}
            title="Como funciona a Venda Futura na Indústria 24h"
            allow="autoplay; encrypted-media; picture-in-picture"
            allowFullScreen
            // Sem borda: o quadro é só o vídeo.
            className="absolute inset-0 h-full w-full border-0"
          />
        ) : (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={CAPA}
              alt="Vídeo: como funciona a Venda Futura na Indústria 24h"
              className="absolute inset-0 h-full w-full object-cover"
            />
            <span className="absolute inset-0 flex items-center justify-center bg-black/25" aria-hidden>
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white/90">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" className="ml-1 text-ink">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </span>
            </span>
          </>
        )}
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
