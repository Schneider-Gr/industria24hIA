"use client";

import { useActionState } from "react";
import {
  alterarChavePixAfiliado,
  type ChavePixAfiliadoState,
} from "@/app/(afiliado)/afiliado/actions";

const TIPOS_PIX = ["CNPJ", "CPF", "EMAIL", "PHONE"];

const inputCls =
  "mt-1 w-full rounded border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-roxo-800 dark:border-line dark:bg-surface";

// Mesma disciplina do ChavePixForm do seller (0035/0058): ação sensível,
// separada, com carência de 24h antes do repasse automático usar a chave.
export function ChavePixAfiliadoForm({
  chaveAtual,
  tipoAtual,
  confirmadaEm,
}: {
  chaveAtual: string | null;
  tipoAtual: string | null;
  confirmadaEm: string | null;
}) {
  const [state, action, pending] = useActionState<ChavePixAfiliadoState, FormData>(
    alterarChavePixAfiliado,
    { ok: false },
  );

  const fimCarencia = confirmadaEm
    ? new Date(new Date(confirmadaEm).getTime() + 24 * 60 * 60 * 1000)
    : null;
  const elegibilidade = !chaveAtual
    ? "Cadastre sua chave PIX para receber as comissões automaticamente."
    : !fimCarencia
      ? "Chave aguardando confirmação — repasses automáticos suspensos até um admin confirmar."
      : fimCarencia > new Date()
        ? `Chave em carência até ${fimCarencia.toLocaleString("pt-BR")}.`
        : "Chave elegível para repasse automático.";

  return (
    <form action={action} className="max-w-3xl space-y-4 rounded-sm border border-borda bg-white p-4">
      <h2 className="text-lg font-bold">Chave PIX de repasse</h2>
      <p className="text-xs text-muted">
        Chave atual: <strong>{chaveAtual ?? "não cadastrada"}</strong>
        {tipoAtual ? ` (${tipoAtual})` : ""}. Trocar a chave reinicia uma
        carência de 24h antes de repasses automáticos usarem a chave nova.
      </p>
      <p className="text-xs font-medium text-muted">{elegibilidade}</p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="text-muted">Nova chave PIX</span>
          <input name="chave_pix" required className={inputCls} />
        </label>
        <label className="block text-sm">
          <span className="text-muted">Tipo da chave</span>
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
          {pending ? "Salvando..." : "Salvar chave PIX"}
        </button>
        {state.ok && <span className="text-sm text-ok">Chave PIX atualizada.</span>}
        {state.error && <span className="text-sm text-erro">{state.error}</span>}
      </div>
    </form>
  );
}
