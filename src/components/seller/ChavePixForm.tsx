"use client";

import { useActionState } from "react";
import type { Tables } from "@/lib/supabase/database.types";
import { alterarChavePix, type ChavePixFormState } from "@/app/(seller)/seller/minha-loja/actions";

const TIPOS_PIX = ["CNPJ", "CPF", "EMAIL", "PHONE"];

const inputCls =
  "mt-1 w-full rounded border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-roxo-800 dark:border-line dark:bg-surface";

// Formulário separado de propósito (docs/e5-seller-onboarding-b2b-auditoria.md,
// seção 2): trocar a chave PIX é uma ação sensível, com auditoria e carência
// de 24h antes de ficar elegível para repasse automático — não pode viver no
// mesmo submit genérico dos dados cadastrais da loja.
export function ChavePixForm({ loja }: { loja: Tables<"lojas"> }) {
  const [state, action, pending] = useActionState<ChavePixFormState, FormData>(
    alterarChavePix,
    { ok: false },
  );

  return (
    <form action={action} className="max-w-3xl space-y-4 rounded border border-line bg-surface p-4">
      <input type="hidden" name="loja_id" defaultValue={loja.id} />
      <h2 className="font-display text-lg font-bold text-ink">Chave PIX de repasse</h2>
      <p className="text-xs text-ink-2">
        Chave atual: <strong>{loja.chave_pix ?? "não cadastrada"}</strong>
        {loja.tipo_chave_pix ? ` (${loja.tipo_chave_pix})` : ""}. Trocar a
        chave reinicia uma carência de 24h antes de repasses automáticos
        usarem a chave nova.
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
          className="rounded bg-laranja px-5 py-2 text-sm font-semibold text-white hover:bg-laranja-escuro disabled:opacity-50"
        >
          {pending ? "Salvando..." : "Trocar chave PIX"}
        </button>
        {state.ok && <span className="text-sm text-ok">Chave PIX atualizada.</span>}
        {state.error && <span className="text-sm text-erro">{state.error}</span>}
      </div>
    </form>
  );
}
