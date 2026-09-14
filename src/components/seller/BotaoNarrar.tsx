"use client";

import { useEffect, useRef, useState } from "react";
import { escolherVoz } from "@/lib/seller/narracao";

// Controle de ouvir/parar do balão do tour.
//
// A narração oficial é a voz clonada da dona, gravada em `public/tour/*.mp3`
// (XTTS-v2 local, skill `voz`) — decisão dela em 14/09/2026, trocando a voz
// sintética do navegador que a primeira versão usava. A síntese do navegador
// fica só como rede de segurança para passo novo que ainda não foi gravado:
// sem ela, acrescentar um passo ao tour deixaria o botão sumir sem explicação.
// Nenhuma das duas existindo, o botão não aparece.

/** Para qualquer fala em andamento. Idempotente e segura no servidor. */
export function pararNarracao() {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
}

export function BotaoNarrar({ texto, audio }: { texto: string; audio?: string }) {
  const [vozes, setVozes] = useState<SpeechSynthesisVoice[] | null>(null);
  const [falando, setFalando] = useState(false);
  const [audioFalhou, setAudioFalhou] = useState(false);
  const elemento = useRef<HTMLAudioElement | null>(null);

  // A lista de vozes chega vazia no primeiro acesso em vários navegadores e só
  // depois dispara `voiceschanged` — daí a assinatura, em vez de ler uma vez.
  useEffect(() => {
    if (!("speechSynthesis" in window)) return;
    const sintese = window.speechSynthesis;
    const ler = () => setVozes(sintese.getVoices());
    ler();
    sintese.addEventListener("voiceschanged", ler);
    return () => sintese.removeEventListener("voiceschanged", ler);
  }, []);

  // Trocar de passo, encerrar o tour ou sair da página cala a voz: nada de
  // narração descrevendo uma tela que já saiu de cena.
  useEffect(() => {
    return () => {
      pararNarracao();
      elemento.current?.pause();
      elemento.current = null;
    };
  }, [texto, audio]);

  const voz = vozes ? escolherVoz(vozes) : null;
  const usarGravacao = Boolean(audio) && !audioFalhou;
  if (!usarGravacao && !voz) return null;

  function parar() {
    pararNarracao();
    elemento.current?.pause();
    elemento.current = null;
    setFalando(false);
  }

  function alternar() {
    if (falando) {
      parar();
      return;
    }
    parar();

    if (usarGravacao) {
      const som = new Audio(`/tour/${audio}.mp3`);
      som.onended = () => setFalando(false);
      // Arquivo ausente ou bloqueado: cai para a síntese no próximo clique,
      // em vez de deixar um botão que não faz nada.
      som.onerror = () => {
        setAudioFalhou(true);
        setFalando(false);
      };
      elemento.current = som;
      void som.play().catch(() => {
        setAudioFalhou(true);
        setFalando(false);
      });
      setFalando(true);
      return;
    }

    if (!voz) return;
    const fala = new SpeechSynthesisUtterance(texto);
    fala.voice = voz;
    fala.lang = voz.lang;
    fala.onend = () => setFalando(false);
    fala.onerror = () => setFalando(false);
    window.speechSynthesis.speak(fala);
    setFalando(true);
  }

  return (
    <button
      type="button"
      onClick={alternar}
      className="inline-flex items-center gap-1.5 rounded-lg border border-white/30 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-white/10"
    >
      <span aria-hidden="true">{falando ? "■" : "▶"}</span>
      {falando ? "Parar" : "Ouvir"}
    </button>
  );
}
