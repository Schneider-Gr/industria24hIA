"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

// Cronômetro das ofertas (decisão da dona em 11/09/2026, change
// mobile-vitrine-densa-benchmark): só existe quando alguma faixa de desconto
// tem `validade` real, e conta até o fim desse dia — a faixa vale até o dia
// da validade inclusive (mesma regra de `preco-faixa.ts`). Antes contava até
// a meia-noite de qualquer dia: urgência sem nada por trás.
function restanteAte(validade: string): string | null {
  const [ano, mes, dia] = validade.split("-").map(Number);
  const fim = new Date(ano, mes - 1, dia, 23, 59, 59, 999);
  const diff = fim.getTime() - Date.now();
  if (diff <= 0) return null;
  const dias = Math.floor(diff / 86400000);
  const h = String(Math.floor((diff % 86400000) / 3600000)).padStart(2, "0");
  const m = String(Math.floor((diff % 3600000) / 60000)).padStart(2, "0");
  const s = String(Math.floor((diff % 60000) / 1000)).padStart(2, "0");
  return dias > 0 ? `${dias}d ${h}:${m}:${s}` : `${h}:${m}:${s}`;
}

export function DealsCountdown({ validade }: { validade: string }) {
  const [restante, setRestante] = useState<string | null>(() => restanteAte(validade));

  useEffect(() => {
    const t = setInterval(() => setRestante(restanteAte(validade)), 1000);
    return () => clearInterval(t);
  }, [validade]);

  if (!restante) return null;

  return (
    <div className="bg-lm-marinho">
      <div className="mx-auto flex max-w-[1280px] flex-wrap items-center justify-between gap-2 px-4 py-2.5 sm:px-6 sm:py-3">
        <div className="flex items-center gap-2.5">
          <span className="rounded-full bg-lm-vermelho px-2.5 py-0.5 text-[11px] font-extrabold tracking-[.04em] text-white">
            OFERTA
          </span>
          <span className="text-[13px] font-semibold text-white/90">Termina em</span>
          <span className="num text-[15px] font-bold tracking-[0.03em] text-lm-amarelo" suppressHydrationWarning>
            {restante}
          </span>
        </div>
        <Link href="/#ofertas" className="flex min-h-11 items-center gap-1 text-[13px] font-bold text-white">
          Ver ofertas
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" aria-hidden>
            <path d="M5 12h14M13 5l7 7-7 7" />
          </svg>
        </Link>
      </div>
    </div>
  );
}
