"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

// Check-in de posição via geolocalização do navegador. O INSERT direto é
// coberto pela policy corrida_posicoes_insert (só o parceiro da corrida, em
// Coletada/EmTransito).
export function GpsCheckin({ corridaId }: { corridaId: string }) {
  const [msg, setMsg] = useState<string | null>(null);

  function enviar() {
    if (!navigator.geolocation) {
      setMsg("Geolocalização indisponível neste navegador.");
      return;
    }
    setMsg("Obtendo posição...");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const supabase = createClient();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- tabela 0039 fora dos tipos gerados
        const { error } = await (supabase as any).from("corrida_posicoes").insert({
          corrida_id: corridaId,
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
        setMsg(error ? `Falha: ${error.message}` : "Posição registrada ✓");
      },
      (err) => setMsg(`Sem GPS: ${err.message}`),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        onClick={enviar}
        className="rounded border border-borda px-3 py-1 text-sm hover:bg-roxo-100"
      >
        📍 Check-in GPS
      </button>
      {msg && <span className="text-xs text-muted">{msg}</span>}
    </span>
  );
}
