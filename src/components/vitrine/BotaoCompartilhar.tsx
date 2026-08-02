"use client";

import { useState } from "react";

// Web Share API nativa (abre o menu de compartilhar do sistema no mobile);
// sem suporte (desktop/navegador antigo), copia o link. Nenhum dado novo,
// puramente client-side.
export function BotaoCompartilhar({
  titulo,
  className,
}: {
  titulo: string;
  className?: string;
}) {
  const [copiado, setCopiado] = useState(false);

  async function aoClicar() {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: titulo, url });
      } catch {
        // usuário cancelou o share sheet — não é erro
      }
      return;
    }
    await navigator.clipboard.writeText(url);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={aoClicar}
        aria-label="Compartilhar"
        title="Compartilhar"
        className={`flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-lm-marinho shadow-md ${className ?? ""}`}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <circle cx="18" cy="5" r="2.6" />
          <circle cx="6" cy="12" r="2.6" />
          <circle cx="18" cy="19" r="2.6" />
          <path d="m8.3 10.7 7.4-4.4M8.3 13.3l7.4 4.4" strokeLinecap="round" />
        </svg>
      </button>
      {copiado && (
        <p role="status" className="absolute right-0 top-12 w-32 rounded-sm bg-lm-marinho px-2.5 py-1.5 text-[11px] text-white shadow-lg">
          Link copiado!
        </p>
      )}
    </div>
  );
}
