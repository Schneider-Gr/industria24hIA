"use client";

import { useActionState } from "react";
import { solicitarCredito, type CreditoFormState } from "@/app/(seller)/seller/credito/actions";

const inputCls =
  "mt-1 w-full rounded border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-roxo-800 dark:border-line dark:bg-surface";

export function CreditoForm() {
  const [state, action, pending] = useActionState<CreditoFormState, FormData>(
    solicitarCredito,
    { ok: false },
  );

  return (
    <form
      action={action}
      className="max-w-xl space-y-4 rounded-lg border border-line bg-surface p-6 dark:border-line dark:bg-surface"
    >
      <label className="block text-sm">
        <span className="text-ink-2 dark:text-ink-2">Valor solicitado (R$) *</span>
        <input name="valor_solicitado" type="number" min="0.01" step="0.01" required className={inputCls} />
      </label>
      <label className="block text-sm">
        <span className="text-ink-2 dark:text-ink-2">Finalidade</span>
        <input name="finalidade" placeholder="Ex.: capital de giro, compra de estoque" className={inputCls} />
      </label>
      <label className="block text-sm">
        <span className="text-ink-2 dark:text-ink-2">Prazo (meses)</span>
        <input name="prazo_meses" type="number" min="1" step="1" className={inputCls} />
      </label>
      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={pending}
          className="rounded bg-laranja px-5 py-2 text-sm font-semibold text-white hover:bg-laranja-escuro disabled:opacity-50"
        >
          {pending ? "Enviando..." : "Solicitar crédito"}
        </button>
        {state.ok && <span className="text-sm text-ok">Solicitação enviada.</span>}
        {state.error && <span className="text-sm text-erro">{state.error}</span>}
      </div>
    </form>
  );
}
