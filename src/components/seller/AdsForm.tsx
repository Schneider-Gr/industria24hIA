"use client";

import { useActionState } from "react";
import { patrocinarProduto, type AdsFormState } from "@/app/(seller)/seller/ads/actions";

const inputCls =
  "mt-1 w-full rounded border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-roxo-800";

export function AdsForm({ produtos }: { produtos: { id: string; nome: string }[] }) {
  const [state, action, pending] = useActionState<AdsFormState, FormData>(
    patrocinarProduto,
    { ok: false },
  );

  return (
    <form action={action} className="max-w-xl space-y-4 rounded-lg border border-line bg-surface p-6">
      <label className="block text-sm">
        <span className="text-ink-2">Produto *</span>
        <select name="produto_id" required className={inputCls} defaultValue="">
          <option value="" disabled>
            Selecione
          </option>
          {produtos.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nome}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm">
        <span className="text-ink-2">Orçamento diário (R$) *</span>
        <input name="orcamento_diario" type="number" min="1" step="0.01" required className={inputCls} />
      </label>
      <div className="grid grid-cols-2 gap-4">
        <label className="block text-sm">
          <span className="text-ink-2">Início *</span>
          <input name="data_inicio" type="date" required className={inputCls} />
        </label>
        <label className="block text-sm">
          <span className="text-ink-2">Fim (opcional)</span>
          <input name="data_fim" type="date" className={inputCls} />
        </label>
      </div>
      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={pending}
          className="rounded bg-laranja px-5 py-2 text-sm font-semibold text-white hover:bg-laranja-escuro disabled:opacity-50"
        >
          {pending ? "Enviando..." : "Patrocinar produto"}
        </button>
        {state.ok && <span className="text-sm text-ok">Pedido registrado.</span>}
        {state.error && <span className="text-sm text-erro">{state.error}</span>}
      </div>
    </form>
  );
}
