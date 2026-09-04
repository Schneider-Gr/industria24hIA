"use client";

import { useState, useTransition } from "react";
import { solicitarRepasse } from "@/app/(seller)/seller/pedidos/actions";

// Equivalente ao botão "Solicitar Transferência" do Bubble, que só aparece
// depois da confirmação de entrega (engenharia reversa do pedido MKMNDBAHAA em
// 04/09/2026). A RPC repasse_solicitar_pedido (0158) revalida dono da loja,
// pagamento e entrega — o gate visual aqui é conveniência, não segurança.
// O erro é capturado no cliente, como em CancelarPedido: server action que
// deixa exceção escapar vira "React error #441" em produção (PR #503).
export function SolicitarRepasse({ pedidoId }: { pedidoId: string }) {
  const [erro, setErro] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <div className="inline-flex flex-col items-start gap-1">
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          setErro(null);
          const fd = new FormData();
          fd.set("pedido_id", pedidoId);
          start(async () => {
            try {
              await solicitarRepasse(fd);
            } catch (e) {
              setErro(e instanceof Error ? e.message : "Falha ao solicitar o repasse.");
            }
          });
        }}
        className="inline-flex min-h-8 items-center rounded bg-lm-azul px-2.5 py-1.5 text-[11px] font-semibold text-white hover:bg-lm-azul-escuro disabled:opacity-40"
      >
        {pending ? "Solicitando…" : "Solicitar repasse"}
      </button>
      {erro && <p className="text-[11px] text-erro">{erro}</p>}
    </div>
  );
}
