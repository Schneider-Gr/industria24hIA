"use client";

import { useActionState } from "react";
import { registrarLeadManual, type RegistrarLeadManualState } from "./actions";

const INITIAL_STATE: RegistrarLeadManualState = { error: null };

// Client component só pra este form: useActionState mostra o erro de
// duplicidade (US18) inline, em vez de deixar o throw da server action
// estourar a error boundary genérica da página (achado de QA, PR #302).
export function LeadManualForm() {
  const [state, formAction, pending] = useActionState(registrarLeadManual, INITIAL_STATE);

  return (
    <form action={formAction} className="mt-3 flex flex-wrap items-start gap-2">
      <input name="nome" placeholder="Nome" className="rounded border border-line px-2 py-1" />
      <input name="contato" placeholder="Telefone ou e-mail" required className="rounded border border-line px-2 py-1" />
      <input name="interesse" placeholder="Interesse" className="w-56 rounded border border-line px-2 py-1" />
      <button type="submit" disabled={pending} className="rounded bg-aco-600 px-3 py-1 font-semibold text-white disabled:opacity-60">
        {pending ? "Registrando…" : "Registrar"}
      </button>
      {state.error && <p className="w-full text-xs font-semibold text-red-700">{state.error}</p>}
    </form>
  );
}
