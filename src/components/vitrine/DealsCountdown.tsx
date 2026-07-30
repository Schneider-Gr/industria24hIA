"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

// Contador até a meia-noite local (mockup industria24h-redesign.html) —
// reforça a identidade "24h"; só renderiza quando há oferta real (produto com
// desconto progressivo ativo) para não criar urgência falsa sem conteúdo atrás.
function formatarRestante(): string {
  const agora = new Date();
  const proximaMeiaNoite = new Date(agora);
  proximaMeiaNoite.setHours(24, 0, 0, 0);
  const diff = Math.max(0, proximaMeiaNoite.getTime() - agora.getTime());
  const h = String(Math.floor(diff / 3600000)).padStart(2, "0");
  const m = String(Math.floor((diff % 3600000) / 60000)).padStart(2, "0");
  const s = String(Math.floor((diff % 60000) / 1000)).padStart(2, "0");
  return `${h}:${m}:${s}`;
}

export function DealsCountdown() {
  const [restante, setRestante] = useState<string | null>(() => formatarRestante());

  useEffect(() => {
    const t = setInterval(() => setRestante(formatarRestante()), 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="bg-lm-marinho">
      <div className="mx-auto flex max-w-[1280px] flex-wrap items-center justify-between gap-2 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <span className="rounded-full bg-lm-vermelho px-3 py-1 text-[12.5px] font-extrabold text-white">
            RELÂMPAGO
          </span>
          <span className="text-[13px] font-semibold text-white/90">Ofertas encerram em</span>
          <span className="font-mono text-[15px] font-bold tracking-[0.03em] text-lm-amarelo" suppressHydrationWarning>
            {restante ?? "--:--:--"}
          </span>
        </div>
        <Link href="/#ofertas" className="flex items-center gap-1 text-[13px] font-bold text-white">
          Ver todas as ofertas
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" aria-hidden>
            <path d="M5 12h14M13 5l7 7-7 7" />
          </svg>
        </Link>
      </div>
    </div>
  );
}
