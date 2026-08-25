"use client";

import { useFormStatus } from "react-dom";

export function VerificarPagamentoBotao() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="mt-3 w-full rounded border border-lm-azul px-5 py-2.5 text-sm font-semibold text-lm-azul hover:bg-lm-azul/5 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Verificando..." : "Já paguei, verificar agora"}
    </button>
  );
}
