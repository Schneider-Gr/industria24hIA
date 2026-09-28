"use client";

import { useActionState } from "react";
import { responderCotacao, type RespostaState } from "../actions";

const inputCls =
  "mt-1 w-full rounded border border-line bg-white px-3 py-2 text-sm focus:border-lm-azul focus:outline-none";

export function FormRespostaCotacao({ id, temCarrinho }: { id: string; temCarrinho: boolean }) {
  const [estado, acao, enviando] = useActionState<RespostaState, FormData>(responderCotacao, { ok: false });
  const v = estado.valores ?? {};

  if (estado.ok) return <p className="font-semibold text-ok">Resposta enviada. O cliente foi avisado.</p>;

  return (
    // key: a action reseta o formulário; remontar com os valores devolvidos
    // evita que o seller redigite tudo para marcar a confirmação.
    <form key={JSON.stringify(v)} action={acao} className="space-y-3">
      <input type="hidden" name="id" value={id} />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <label className="block">
          <span className="text-ink-2">Valor do frete (R$) *</span>
          <input name="valor" inputMode="decimal" placeholder="35,00 (0 = grátis)" defaultValue={v.valor} className={inputCls} />
        </label>
        <label className="block">
          <span className="text-ink-2">Prazo mínimo (dias úteis) *</span>
          <input name="prazo_min" type="number" min={1} max={60} defaultValue={v.prazo_min || 1} className={inputCls} />
        </label>
        <label className="block">
          <span className="text-ink-2">Prazo máximo (dias úteis) *</span>
          <input name="prazo_max" type="number" min={1} max={60} defaultValue={v.prazo_max || 3} className={inputCls} />
        </label>
      </div>
      {temCarrinho && (
        <label className="block">
          <span className="text-ink-2">Valor para levar o carrinho inteiro junto (opcional)</span>
          <input name="valor_carrinho" inputMode="decimal" placeholder="60,00" defaultValue={v.valor_carrinho} className={inputCls} />
        </label>
      )}
      {estado.pedirConfirmacao && (
        <label className="flex items-start gap-2 rounded border border-warn/40 bg-warn/10 p-2">
          <input type="checkbox" name="confirmado" className="mt-0.5" />
          Confirmo o valor do frete, mesmo acima de 50% do valor dos produtos.
        </label>
      )}
      {estado.error && <p className="text-erro">{estado.error}</p>}
      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          name="acao"
          value="responder"
          disabled={enviando}
          className="rounded bg-lm-azul px-4 py-2 font-semibold text-white hover:bg-lm-azul-escuro disabled:opacity-50"
        >
          Enviar valor e prazo
        </button>
        <button
          type="submit"
          name="acao"
          value="recusar"
          disabled={enviando}
          className="rounded border border-line px-4 py-2 font-semibold text-ink hover:bg-lm-cinza disabled:opacity-50"
        >
          Não entrego nesse CEP
        </button>
      </div>
    </form>
  );
}
