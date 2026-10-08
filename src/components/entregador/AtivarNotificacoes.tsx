"use client";

import { useEffect, useState } from "react";
import { desinscreverPush, inscreverPush, type InscricaoPush } from "./push-actions";

const CHAVE = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

function chaveEmBytes(base64: string): Uint8Array<ArrayBuffer> {
  const b64 = (base64 + "=".repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  const cru = atob(b64);
  const saida = new Uint8Array(new ArrayBuffer(cru.length));
  for (let i = 0; i < cru.length; i++) saida[i] = cru.charCodeAt(i);
  return saida;
}

type Estado = "carregando" | "sem_suporte" | "instalar_ios" | "bloqueado" | "desligado" | "ligado";

/** Liga e desliga a notificação push de corrida nova neste aparelho. */
export function AtivarNotificacoes() {
  const [estado, setEstado] = useState<Estado>("carregando");
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  useEffect(() => {
    let vivo = true;
    (async () => {
      const suporta = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
      if (!suporta) {
        // No iPhone o push só existe com o site instalado na tela de início.
        const ios = /iPad|iPhone|iPod/.test(navigator.userAgent);
        const instalado = window.matchMedia("(display-mode: standalone)").matches;
        if (vivo) setEstado(ios && !instalado ? "instalar_ios" : "sem_suporte");
        return;
      }
      if (Notification.permission === "denied") {
        if (vivo) setEstado("bloqueado");
        return;
      }
      const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" });
      const atual = await reg.pushManager.getSubscription();
      // Regrava a cada abertura: o navegador pode ter renovado a inscrição, e
      // o aparelho pode ter trocado de usuário.
      if (atual) await inscreverPush(atual.toJSON() as InscricaoPush);
      if (vivo) setEstado(atual ? "ligado" : "desligado");
    })().catch(() => vivo && setEstado("sem_suporte"));
    return () => {
      vivo = false;
    };
  }, []);

  async function ligar() {
    setOcupado(true);
    setErro(null);
    try {
      if ((await Notification.requestPermission()) !== "granted") {
        setEstado(Notification.permission === "denied" ? "bloqueado" : "desligado");
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: chaveEmBytes(CHAVE) });
      const r = await inscreverPush(sub.toJSON() as InscricaoPush);
      if (!r.ok) {
        await sub.unsubscribe();
        setErro(r.erro ?? "Não foi possível ativar as notificações.");
        return;
      }
      setEstado("ligado");
    } catch {
      setErro("Não foi possível ativar as notificações neste aparelho.");
    } finally {
      setOcupado(false);
    }
  }

  async function desligar() {
    setOcupado(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await desinscreverPush(sub.endpoint);
        await sub.unsubscribe();
      }
      setEstado("desligado");
    } finally {
      setOcupado(false);
    }
  }

  if (!CHAVE || estado === "carregando" || estado === "sem_suporte") return null;

  const caixa = "rounded border border-line bg-surface p-3 text-sm text-ink";
  if (estado === "instalar_ios") {
    return (
      <p className={caixa}>
        Para receber aviso de corrida nova no iPhone, instale o app: toque em Compartilhar e depois em &quot;Adicionar à
        Tela de Início&quot;.
      </p>
    );
  }
  if (estado === "bloqueado") {
    return (
      <p className={caixa}>
        As notificações estão bloqueadas neste aparelho. Libere nas configurações do navegador para ser avisado de
        corrida nova.
      </p>
    );
  }
  return (
    <div className={`${caixa} flex flex-wrap items-center gap-3`}>
      <span>
        {estado === "ligado"
          ? "Notificações ligadas: você é avisado quando chega corrida nova."
          : "Receba um aviso no celular quando chegar corrida nova."}
      </span>
      <button
        type="button"
        onClick={estado === "ligado" ? desligar : ligar}
        disabled={ocupado}
        className={
          estado === "ligado"
            ? "rounded border border-line px-3 py-1.5 text-sm text-ink-2 disabled:opacity-60"
            : "rounded bg-aco-600 px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-60"
        }
      >
        {ocupado ? "Aguarde…" : estado === "ligado" ? "Desligar" : "Ativar notificações"}
      </button>
      {erro && (
        <span role="alert" className="text-sm text-erro">
          {erro}
        </span>
      )}
    </div>
  );
}
