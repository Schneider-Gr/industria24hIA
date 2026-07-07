"use client";

import { useActionState } from "react";
import { criarCentro, type CentroFormState } from "@/app/(seller)/seller/centros/actions";

const inputCls =
  "mt-1 w-full rounded border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-roxo-800 dark:border-line dark:bg-surface";

export function CentroForm() {
  const [state, action, pending] = useActionState<CentroFormState, FormData>(
    criarCentro,
    { ok: false },
  );

  return (
    <form
      action={action}
      className="max-w-xl space-y-4 rounded-lg border border-line bg-surface p-6 dark:border-line dark:bg-surface"
    >
      <label className="block text-sm">
        <span className="text-ink-2 dark:text-ink-2">Nome *</span>
        <input name="nome" required className={inputCls} />
      </label>
      <label className="block text-sm">
        <span className="text-ink-2 dark:text-ink-2">Localização</span>
        <input name="localizacao" placeholder="Ex.: Manaus, Rua Marapatá" className={inputCls} />
      </label>
      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={pending}
          className="rounded bg-laranja px-5 py-2 text-sm font-semibold text-white hover:bg-laranja-escuro disabled:opacity-50"
        >
          {pending ? "Salvando..." : "Adicionar centro"}
        </button>
        {state.ok && <span className="text-sm text-ok">Centro criado.</span>}
        {state.error && <span className="text-sm text-erro">{state.error}</span>}
      </div>
    </form>
  );
}
