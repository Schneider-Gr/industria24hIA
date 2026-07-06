"use client";

import { useActionState } from "react";
import { criarCentro, type CentroFormState } from "@/app/(seller)/seller/centros/actions";

const inputCls =
  "mt-1 w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-500 dark:border-neutral-700 dark:bg-neutral-900";

export function CentroForm() {
  const [state, action, pending] = useActionState<CentroFormState, FormData>(
    criarCentro,
    { ok: false },
  );

  return (
    <form
      action={action}
      className="max-w-xl space-y-4 rounded-lg border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900"
    >
      <label className="block text-sm">
        <span className="text-neutral-600 dark:text-neutral-300">Nome *</span>
        <input name="nome" required className={inputCls} />
      </label>
      <label className="block text-sm">
        <span className="text-neutral-600 dark:text-neutral-300">Localização</span>
        <input name="localizacao" placeholder="Ex.: Manaus, Rua Marapatá" className={inputCls} />
      </label>
      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-neutral-900 px-5 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50 dark:bg-white dark:text-neutral-900"
        >
          {pending ? "Salvando..." : "Adicionar centro"}
        </button>
        {state.ok && <span className="text-sm text-green-600">Centro criado.</span>}
        {state.error && <span className="text-sm text-red-600">{state.error}</span>}
      </div>
    </form>
  );
}
