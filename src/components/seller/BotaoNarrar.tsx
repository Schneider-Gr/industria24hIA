"use client";

import { useEffect, useState } from "react";
import { escolherVoz } from "@/lib/seller/narracao";

// Controle de ouvir/parar do balão do tour. A fala é sempre do texto do passo
// atual, então não existe áudio a manter em sincronia com o conteúdo.
//
// Some quando o sistema não tem voz em português: um botão que lê o painel com
// voz inglesa é pior que botão nenhum (spec `tour-narrado`).

/** Para qualquer fala em andamento. Idempotente e segura no servidor. */
export function pararNarracao() {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
}

export function BotaoNarrar({ texto }: { texto: string }) {
  const [vozes, setVozes] = useState<SpeechSynthesisVoice[] | null>(null);
  const [falando, setFalando] = useState(false);

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
    };
  }, [texto]);

  const voz = vozes ? escolherVoz(vozes) : null;
  if (!voz) return null;

  function alternar() {
    if (falando) {
      pararNarracao();
      setFalando(false);
      return;
    }
    pararNarracao();
    const fala = new SpeechSynthesisUtterance(texto);
    fala.voice = voz;
    fala.lang = voz!.lang;
    fala.onend = () => setFalando(false);
    fala.onerror = () => setFalando(false);
    window.speechSynthesis.speak(fala);
    setFalando(true);
  }

  return (
    <button
      type="button"
      onClick={alternar}
      className="inline-flex items-center gap-1.5 rounded border border-line px-2 py-1 text-xs font-semibold text-ink-2 hover:border-aco-600 hover:text-aco-600"
    >
      <span aria-hidden="true">{falando ? "■" : "▶"}</span>
      {falando ? "Parar" : "Ouvir"}
    </button>
  );
}
