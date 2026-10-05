"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { embedTrajeto } from "@/lib/geo";
import { estaAoVivo, rastreavel, textoUltimaAtualizacao } from "@/lib/logistica-parceiro/rastreio";
import { etaRastreio } from "@/app/pedido/[id]/actions";

type Posicao = { lat: number; lng: number; criado_em: string };

const INTERVALO_ETA_MS = 120_000;

// Rastreio ao vivo para o comprador (OpenSpec entregador-rastreio-zonas-rotas,
// grupo 3). A posição vem com a sessão do comprador, então só aparece o que a
// RLS da 0212 libera: corrida do próprio pedido, antes de Entregue/Cancelada.
export function RastreioComprador({
  pedidoId,
  corridaId,
  status,
  destino,
}: {
  pedidoId: string;
  corridaId: string;
  status: string;
  destino: string;
}) {
  const [pos, setPos] = useState<Posicao | null>(null);
  const [agora, setAgora] = useState(() => Date.now());
  const [eta, setEta] = useState<number | null>(null);
  const ultimoEta = useRef(0);
  // Assina desde antes da coleta: o primeiro ponto (gravado só em Coletada/
  // EmTransito) faz o mapa aparecer sem o comprador recarregar a página.
  const ativo = status !== "Entregue" && status !== "Cancelada";

  useEffect(() => {
    if (!ativo) return;
    const supabase = createClient();
    supabase
      .from("corrida_posicoes")
      .select("lat, lng, criado_em")
      .eq("corrida_id", corridaId)
      .order("criado_em", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => data && setPos(data));

    const canal = supabase
      .channel(`rastreio:${corridaId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "corrida_posicoes", filter: `corrida_id=eq.${corridaId}` },
        (p) => setPos(p.new as Posicao),
      )
      .subscribe();
    const relogio = setInterval(() => setAgora(Date.now()), 30_000);
    return () => {
      clearInterval(relogio);
      supabase.removeChannel(canal);
    };
  }, [ativo, corridaId]);

  useEffect(() => {
    if (!pos || !estaAoVivo(pos.criado_em, Date.now())) return;
    if (Date.now() - ultimoEta.current < INTERVALO_ETA_MS) return;
    ultimoEta.current = Date.now();
    etaRastreio(pedidoId).then((r) => setEta(r?.minutos ?? null), () => setEta(null));
  }, [pos, pedidoId]);

  if (!ativo) return null;
  if (!pos && !rastreavel(status)) {
    return (
      <p className="mt-4 rounded border border-line bg-white p-3 text-sm text-muted">
        🚚 Entrega por entregador parceiro. O acompanhamento ao vivo aparece aqui quando ele coletar o pedido.
      </p>
    );
  }

  return (
    <div className="mt-4 rounded border border-line bg-white p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-ink">Acompanhe sua entrega</p>
        {pos && (
          <span
            className={`rounded px-2 py-0.5 text-xs font-semibold ${estaAoVivo(pos.criado_em, agora) ? "bg-ok/10 text-ok" : "bg-warn/10 text-warn"}`}
          >
            {textoUltimaAtualizacao(pos.criado_em, agora)}
          </span>
        )}
      </div>
      {pos ? (
        <>
          {eta != null && estaAoVivo(pos.criado_em, agora) && (
            <p className="mt-1 text-sm text-muted">
              Chega em cerca de <span className="num font-semibold text-ink">{eta} min</span>
            </p>
          )}
          <iframe
            title="Posição do entregador"
            src={embedTrajeto(`${pos.lat},${pos.lng}`, destino)}
            className="mt-2 aspect-[16/10] w-full rounded border border-line"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </>
      ) : (
        <p className="mt-1 text-sm text-muted">
          O entregador ainda não compartilhou a localização. Esta tela atualiza sozinha.
        </p>
      )}
    </div>
  );
}
