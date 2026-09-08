"use client";

import { abrirAtendimento } from "@/components/bot/abrirAtendimento";

// Primeira mensagem enviada em nome do visitante: o bot já entra no assunto
// certo e, seguindo o prompt da persona seller, qualifica e chama
// registrar_lead — é assim que o clique na LP vira lead no funil do CRM
// (public.leads, persona='seller', fonte='bot_site').
const PRIMEIRA_MENSAGEM =
  "Tenho uma indústria e quero vender na Indústria 24h. Pode me explicar como funciona e o que preciso para começar?";

export function CtaFalarComConsultor({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      className={className}
      onClick={() => abrirAtendimento({ persona: "seller", mensagem: PRIMEIRA_MENSAGEM })}
    >
      {children}
    </button>
  );
}
