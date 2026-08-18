"use client";

import { useActionState } from "react";
import { enviarFollowupEmail, type EnviarFollowupEmailState } from "./actions";

const INITIAL_STATE: EnviarFollowupEmailState = { error: null, ok: false };

// Client component por lead: useActionState mostra erro/sucesso inline
// (mesmo padrão de LeadManualForm — evitar a error boundary genérica do
// Next quando a action falha).
export function EmailFollowupForm({ leadId }: { leadId: string }) {
  const [state, formAction, pending] = useActionState(enviarFollowupEmail.bind(null, leadId), INITIAL_STATE);

  return (
    <form action={formAction} className="mt-1 flex flex-col gap-1">
      <input name="template" placeholder="Mensagem de follow-up" required className="rounded border border-line px-1 py-0.5" />
      <button type="submit" disabled={pending} className="self-start font-semibold text-aco-600 hover:underline disabled:opacity-60">
        {pending ? "Enviando…" : "Enviar"}
      </button>
      {state.error && <p className="text-red-700">{state.error}</p>}
      {state.ok && <p className="text-green-700">E-mail enviado.</p>}
    </form>
  );
}
