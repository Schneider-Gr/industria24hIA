"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createClient } from "@/lib/supabase/client";
import { deveEnviarPosicao, rastreavel, type PontoGps } from "@/lib/logistica-parceiro/rastreio";

// Envio contínuo da posição enquanto a corrida está Coletada/EmTransito
// (substitui o clique do antigo GpsCheckin). Quem pode gravar é a RLS da 0212:
// parceiro da corrida ou afiliado exclusivo. Só envia com a tela aberta (PWA,
// premissa P1); em trânsito pede Wake Lock para a tela não apagar.
// Suporte do navegador não muda durante a vida da página: lido no cliente, e o
// servidor assume que existe (o aviso só aparece depois da hidratação).
const nuncaMuda = () => () => {};
function useSuporte(teste: () => boolean): boolean {
  return useSyncExternalStore(nuncaMuda, teste, () => true);
}

export function RastreioEntregador({ corridaId, status }: { corridaId: string; status: string }) {
  const [msg, setMsg] = useState("Ativando localização...");
  const [erro, setErro] = useState(false);
  const ultimo = useRef<PontoGps | null>(null);
  const ativo = rastreavel(status);
  const temGps = useSuporte(() => "geolocation" in navigator);
  const temWakeLock = useSuporte(() => "wakeLock" in navigator);

  useEffect(() => {
    if (!ativo || !temGps) return;
    const supabase = createClient();
    const id = navigator.geolocation.watchPosition(
      async (pos) => {
        const atual = { lat: pos.coords.latitude, lng: pos.coords.longitude, em: Date.now() };
        if (!deveEnviarPosicao(ultimo.current, atual)) return;
        ultimo.current = atual;
        const { error } = await supabase
          .from("corrida_posicoes")
          .insert({ corrida_id: corridaId, lat: atual.lat, lng: atual.lng });
        setErro(Boolean(error));
        setMsg(
          error
            ? `Falha ao enviar posição: ${error.message}`
            : `Compartilhando sua localização com o comprador · ${new Date(atual.em).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`,
        );
      },
      (e) => {
        setErro(true);
        setMsg(
          e.code === e.PERMISSION_DENIED
            ? "Localização negada. Libere o GPS para o comprador acompanhar a entrega."
            : `Sem GPS no momento: ${e.message}`,
        );
      },
      { enableHighAccuracy: true, maximumAge: 10_000, timeout: 30_000 },
    );
    return () => navigator.geolocation.clearWatch(id);
  }, [ativo, temGps, corridaId]);

  // Wake Lock: o navegador solta a trava quando a aba some; pede de novo ao voltar.
  const [wakeLockRecusado, setWakeLockRecusado] = useState(false);
  useEffect(() => {
    if (status !== "EmTransito" || !temWakeLock) return;
    let trava: WakeLockSentinel | null = null;
    const pedir = () => {
      if (document.visibilityState !== "visible") return;
      navigator.wakeLock.request("screen").then(
        (t) => (trava = t),
        () => setWakeLockRecusado(true),
      );
    };
    pedir();
    document.addEventListener("visibilitychange", pedir);
    return () => {
      document.removeEventListener("visibilitychange", pedir);
      trava?.release().catch(() => {});
    };
  }, [status, temWakeLock]);

  if (!ativo) return null;
  const semWakeLock = status === "EmTransito" && (!temWakeLock || wakeLockRecusado);
  const aviso = temGps ? msg : "Este navegador não tem GPS. O comprador não verá o trajeto.";
  return (
    <div className={`w-full rounded border px-3 py-2 text-xs ${erro || !temGps ? "border-warn/40 bg-warn/10 text-warn" : "border-borda bg-aco-100 text-muted"}`}>
      <p>📍 {aviso}</p>
      {semWakeLock && <p className="mt-1">Mantenha esta tela aberta e ligada durante a entrega.</p>}
    </div>
  );
}
