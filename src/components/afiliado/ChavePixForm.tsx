"use client";

import { useActionState } from "react";
import { alterarChavePixAfiliado, type ChavePixFormState } from "@/app/(afiliado)/afiliado/actions";

const TIPOS_PIX = ["CNPJ", "CPF", "EMAIL", "PHONE"];

const inputCls =
  "mt-1 w-full rounded border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-aco-600 dark:border-line dark:bg-surface";

// Mesmo padrão do ChavePixForm de seller (docs de onboarding b2b, seção 2):
// troca de chave PIX é ação sensível, com auditoria e carência de 24h antes
// de ficar elegível para repasse automático (0115).
export function ChavePixForm({
  chavePix,
  tipoChavePix,
}: {
  chavePix: string | null;
  tipoChavePix: string | null;
}) {
  const [state, action, pending] = useActionState<ChavePixFormState, FormData>(
    alterarChavePixAfiliado,
    { ok: false },
  );

  return (
    <form action={action} className="max-w-3xl space-y-4 rounded border border-line bg-surface p-4">
      <h2 className="font-display text-lg font-bold text-ink">Chave PIX de repasse</h2>
      <p className="text-xs text-ink-2">
        Chave atual: <strong>{chavePix ?? "não cadastrada"}</strong>
        {tipoChavePix ? ` (${tipoChavePix})` : ""}. Trocar a chave reinicia
        uma carência de 24h antes de repasses automáticos usarem a chave nova.
      </p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="text-ink-2">Nova chave PIX</span>
          <input name="chave_pix" required className={inputCls} />
        </label>
        <label className="block text-sm">
          <span className="text-ink-2">Tipo da chave</span>
          <select name="tipo_chave_pix" defaultValue="" required className={inputCls}>
            <option value="" disabled>
              Selecione
            </option>
            {TIPOS_PIX.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={pending}
          className="rounded bg-sinal px-5 py-2 text-sm font-semibold text-white hover:bg-sinal-escuro disabled:opacity-50"
        >
          {pending ? "Salvando..." : "Trocar chave PIX"}
        </button>
        {state.ok && <span className="text-sm text-ok">Chave PIX atualizada.</span>}
        {state.error && <span className="text-sm text-erro">{state.error}</span>}
      </div>
    </form>
  );
}
