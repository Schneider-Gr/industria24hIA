"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { buscarAlertasSeller } from "@/app/(seller)/seller/alertas-actions";
import { alertasNovos, lembrarVistos, type Alerta } from "@/lib/seller/alertas";

const CHAVE_VISTOS = "industria24h.seller.alertas-vistos.v1";
const INTERVALO_MS = 45_000;
const MAX_NA_TELA = 3;

const ROTULO: Record<Alerta["tipo"], string> = {
  cotacao: "Cotação de frete",
  disputa: "Disputa",
  mensagem: "Mensagem",
};

function lerVistos(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(CHAVE_VISTOS) ?? "[]");
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

function gravarVistos(lista: string[]) {
  try {
    localStorage.setItem(CHAVE_VISTOS, JSON.stringify(lista));
  } catch {
    // navegador sem localStorage: o pop-up só reaparece no próximo carregamento
  }
}

/** Pop-up do que chegou do comprador (cotação, disputa, mensagem). Busca a
 * cada 45 s e ao voltar para a aba; o que já foi visto neste navegador não
 * reaparece. ponytail: polling, não realtime; troque por Supabase Realtime se
 * 45 s de atraso incomodar. */
export function AlertasPopup() {
  const [novos, setNovos] = useState<Alerta[]>([]);

  const verificar = useCallback(async () => {
    const todos = await buscarAlertasSeller().catch(() => [] as Alerta[]);
    // Só o que ainda não foi visto neste navegador, no máximo três por vez.
    setNovos(alertasNovos(todos, new Set(lerVistos())).slice(0, MAX_NA_TELA));
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- primeira busca ao montar, mesmo padrão do polling abaixo
    verificar();
    const timer = setInterval(verificar, INTERVALO_MS);
    const aoVoltar = () => document.visibilityState === "visible" && verificar();
    document.addEventListener("visibilitychange", aoVoltar);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", aoVoltar);
    };
  }, [verificar]);

  const dispensar = (chaves: string[]) => {
    gravarVistos(lembrarVistos(lerVistos(), chaves));
    setNovos((atual) => atual.filter((a) => !chaves.includes(a.chave)));
  };

  if (novos.length === 0) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed right-4 bottom-4 z-50 flex w-[min(360px,calc(100vw-2rem))] flex-col gap-2"
    >
      {novos.map((a) => (
        <div key={a.chave} className="rounded-lg border border-lm-azul/40 bg-white p-3 shadow-lg">
          <div className="flex items-start justify-between gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-lm-azul">{ROTULO[a.tipo]}</p>
            <button
              type="button"
              onClick={() => dispensar([a.chave])}
              aria-label="Dispensar aviso"
              className="-mt-1 text-lg leading-none text-muted hover:text-ink"
            >
              ×
            </button>
          </div>
          <p className="text-sm font-semibold text-ink">{a.titulo}</p>
          <p className="mt-0.5 line-clamp-2 text-[13px] text-ink-2">{a.trecho}</p>
          <Link
            href={a.href}
            onClick={() => dispensar([a.chave])}
            className="mt-2 inline-flex rounded bg-lm-azul px-3 py-1.5 text-[13px] font-semibold text-white hover:bg-lm-azul-escuro"
          >
            Responder
          </Link>
        </div>
      ))}
      {novos.length > 1 && (
        <button
          type="button"
          onClick={() => dispensar(novos.map((a) => a.chave))}
          className="self-end text-[12px] text-muted underline underline-offset-2"
        >
          Dispensar todos
        </button>
      )}
    </div>
  );
}
