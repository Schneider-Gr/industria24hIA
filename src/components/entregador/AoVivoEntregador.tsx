"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Recarrega os dados da tela do entregador quando uma corrida nasce ou muda.
// O Realtime entrega só as linhas que a RLS deixa este usuário ler (0216).
// O relógio de 60 s cobre o que não gera evento no banco: a exclusividade de
// 5 min vencendo (a corrida passa ao pool sem nenhum UPDATE) e pedidos novos.
export function AoVivoEntregador() {
  const router = useRouter();
  const [conectado, setConectado] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    let espera: ReturnType<typeof setTimeout> | null = null;
    // Vários eventos seguidos (despacho + trajeto gravado) viram uma recarga só.
    const recarregar = () => {
      if (espera) clearTimeout(espera);
      espera = setTimeout(() => router.refresh(), 400);
    };
    const canal = supabase
      .channel("entregador-corridas")
      .on("postgres_changes", { event: "*", schema: "public", table: "corridas" }, recarregar)
      .subscribe((status) => setConectado(status === "SUBSCRIBED"));
    const relogio = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, 60_000);
    const aoVoltar = () => {
      if (document.visibilityState === "visible") router.refresh();
    };
    document.addEventListener("visibilitychange", aoVoltar);

    return () => {
      if (espera) clearTimeout(espera);
      clearInterval(relogio);
      document.removeEventListener("visibilitychange", aoVoltar);
      supabase.removeChannel(canal);
    };
  }, [router]);

  return (
    <p className="flex items-center gap-2 text-xs text-muted" aria-live="polite">
      <span className={`inline-block size-2 rounded-full ${conectado ? "bg-ok" : "bg-line"}`} aria-hidden />
      {conectado ? "Ao vivo: as corridas aparecem aqui sem recarregar." : "Conectando…"}
    </p>
  );
}
