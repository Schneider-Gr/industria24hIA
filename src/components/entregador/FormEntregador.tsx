"use client";

import { useActionState } from "react";
import { confirmarEntregaPublica, type ConfirmarEntregaPublicaState } from "@/app/entregador/actions";

const inputCls =
  "mt-1 w-full rounded border border-line bg-white px-3 py-2.5 text-sm outline-none focus:border-lm-azul";

export function FormEntregador() {
  const [state, action, pending] = useActionState<ConfirmarEntregaPublicaState, FormData>(
    confirmarEntregaPublica,
    { ok: false },
  );

  if (state.ok) {
    return (
      <div className="rounded border border-verde-24h bg-ok/10 p-6 text-center">
        <p className="text-lg font-semibold text-ink">{state.mensagem}</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-4 rounded border border-lm-azul px-4 py-2 text-sm font-semibold text-lm-azul"
        >
          Confirmar outra entrega
        </button>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4 rounded border border-line bg-white p-6">
      <label className="block text-sm">
        <span className="font-medium text-ink">Número do pedido *</span>
        <input
          name="id_venda"
          required
          placeholder="Ex.: L77DFL0LMJ"
          autoCapitalize="characters"
          className={`${inputCls} num uppercase`}
        />
      </label>
      <label className="block text-sm">
        <span className="font-medium text-ink">Código do comprador *</span>
        <input
          name="codigo"
          required
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={4}
          placeholder="4 dígitos"
          className={`${inputCls} num`}
        />
      </label>
      <label className="block text-sm">
        <span className="font-medium text-ink">Seu nome *</span>
        <input name="nome_entregador" required placeholder="Nome completo" className={inputCls} />
      </label>

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded bg-lm-azul px-5 py-3 text-base font-semibold text-white hover:bg-lm-azul-escuro disabled:opacity-50"
      >
        {pending ? "Confirmando..." : "Confirmar entrega"}
      </button>

      {state.erro && <p className="text-sm text-erro">{state.erro}</p>}
    </form>
  );
}
