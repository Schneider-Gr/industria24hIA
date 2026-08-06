"use client";

import { useState, useTransition } from "react";
import { cancelarPedido } from "@/app/(seller)/seller/pedidos/actions";

// Cancelamento exige motivo (auditado em auditoria_eventos pela RPC
// pedido_cancelar, 0107). Confirmação nativa evita clique acidental.
export function CancelarPedido({ pedidoId }: { pedidoId: string }) {
  const [motivo, setMotivo] = useState("");
  const [aberto, setAberto] = useState(false);
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
        await cancelarPedido(fd);
        setMotivo("");
        setAberto(false);
      } catch (e) {
        setErro(e instanceof Error ? e.message : "Falha ao cancelar.");
      }
    });
  }

  if (aberto) {
    return (
      <div className="mt-2 space-y-1.5">
        <textarea
          rows={2}
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          placeholder="Motivo do cancelamento (obrigatório)"
          className="w-full max-w-sm rounded border border-line bg-transparent p-1.5 text-xs"
        />
        <div className="flex gap-1.5">
          <button
            type="button"
            disabled={pending}
            onClick={enviar}
            className="rounded bg-erro px-2 py-1 text-xs font-semibold text-white disabled:opacity-40"
          >
            Confirmar cancelamento
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              setAberto(false);
              setErro(null);
            }}
            className="rounded border border-line px-2 py-1 text-xs"
          >
            Voltar
          </button>
        </div>
        {erro && <p className="text-xs text-erro">{erro}</p>}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setAberto(true)}
      className="rounded border border-erro px-2 py-1 text-[11px] font-semibold text-erro"
    >
      Cancelar pedido
    </button>
  );
}
