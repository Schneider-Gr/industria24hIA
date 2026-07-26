"use client";

import { useState, useTransition } from "react";
import { estornarPedido, abrirDisputa } from "@/app/(admin)/admin/pedidos/actions";

// Estorno e disputa exigem motivo (auditado em auditoria_eventos pela RPC).
// Confirmação nativa evita clique acidental num pedido pago.
export function AcoesPedido({ pedidoId, disputaAberta }: { pedidoId: string; disputaAberta: boolean }) {
  const [motivo, setMotivo] = useState("");
  const [aberto, setAberto] = useState<"estorno" | "disputa" | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function enviar() {
    if (!motivo.trim()) {
      setErro("Descreva o motivo.");
      return;
    }
    setErro(null);
    const fd = new FormData();
    fd.set("pedido_id", pedidoId);
    fd.set("motivo", motivo);
    start(async () => {
      try {
        if (aberto === "estorno") await estornarPedido(fd);
        else await abrirDisputa(fd);
        setMotivo("");
        setAberto(null);
      } catch (e) {
        setErro(e instanceof Error ? e.message : "Falha ao registrar.");
      }
    });
  }

  if (aberto) {
    return (
      <div className="space-y-1.5">
        <textarea
          rows={2}
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          placeholder="Motivo (obrigatório)"
          className="w-48 rounded border border-line bg-transparent p-1.5 text-xs"
        />
        <div className="flex gap-1.5">
          <button
            type="button"
            disabled={pending}
            onClick={enviar}
            className="rounded bg-erro px-2 py-1 text-xs font-semibold text-white disabled:opacity-40"
          >
            Confirmar
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              setAberto(null);
              setErro(null);
            }}
            className="rounded border border-line px-2 py-1 text-xs"
          >
            Cancelar
          </button>
        </div>
        {erro && <p className="text-xs text-erro">{erro}</p>}
      </div>
    );
  }

  return (
    <div className="flex gap-1.5">
      <button
        type="button"
        onClick={() => setAberto("estorno")}
        className="rounded border border-erro px-2 py-1 text-xs font-semibold text-erro"
      >
        Estornar
      </button>
      {!disputaAberta && (
        <button
          type="button"
          onClick={() => setAberto("disputa")}
          className="rounded border border-line px-2 py-1 text-xs"
        >
          Disputa
        </button>
      )}
    </div>
  );
}
