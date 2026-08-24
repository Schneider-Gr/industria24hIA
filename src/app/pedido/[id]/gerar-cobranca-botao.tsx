"use client";

import { useFormStatus } from "react-dom";

// PRD 010 US02: form action direto (sem useActionState) não tem estado de
// pending nativo — useFormStatus é o único jeito de saber que a Server
// Action está em andamento sem reescrever o form inteiro.
export function GerarCobrancaBotao() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="col-span-2 rounded bg-lm-azul px-5 py-2.5 text-sm font-semibold text-white hover:bg-lm-azul-escuro disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Gerando cobrança..." : "Pagar"}
    </button>
  );
}
