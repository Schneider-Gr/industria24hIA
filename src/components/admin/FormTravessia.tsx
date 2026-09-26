"use client";

import { useActionState } from "react";
import { salvarTravessia, type TravessiaState } from "@/app/(admin)/admin/travessias/actions";

export type TravessiaLinha = {
  id: string;
  nome: string;
  operador: string | null;
  valor_equivalente: number;
  fator_moto: number | null;
  fator_carro: number | null;
  fator_caminhao: number | null;
  fatores_oficiais: boolean;
  fonte_url: string | null;
  fonte_descricao: string | null;
  vigente_desde: string | null;
  ativo: boolean;
  atualizado_em: string;
};

const inputCls = "mt-1 w-full rounded border border-line bg-surface px-2 py-1.5 text-sm outline-none focus:border-aco-600";
const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

// Um formulário por travessia (e um vazio para criar). defaultValue: após salvar,
// a página revalida e o form volta com o valor gravado.
export function FormTravessia({ travessia: t }: { travessia?: TravessiaLinha }) {
  const [state, action, pending] = useActionState<TravessiaState, FormData>(salvarTravessia, { ok: false });
  const valor = t ? Number(t.valor_equivalente) : 0;
  const porVeiculo = (f: number | null) => (t && f != null ? brl(valor * Number(f)) : "—");

  return (
    <form action={action} className="space-y-3 rounded-lg border border-line p-4">
      {t && <input type="hidden" name="id" value={t.id} />}
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="block text-sm sm:col-span-2">
          <span className="text-ink-2">Nome</span>
          <input name="nome" required defaultValue={t?.nome ?? ""} className={inputCls} />
        </label>
        <label className="block text-sm">
          <span className="text-ink-2">Operador</span>
          <input name="operador" defaultValue={t?.operador ?? ""} className={inputCls} />
        </label>
        <label className="block text-sm">
          <span className="text-ink-2">R$ por veículo equivalente</span>
          <input name="valor_equivalente" type="number" min="0.01" step="0.01" required defaultValue={t?.valor_equivalente ?? ""} className={`${inputCls} num`} />
        </label>
        <label className="block text-sm">
          <span className="text-ink-2">Vigente desde</span>
          <input name="vigente_desde" type="date" defaultValue={t?.vigente_desde ?? ""} className={inputCls} />
        </label>
        <div className="flex items-end gap-4 text-sm">
          <label className="flex items-center gap-2">
            <input type="checkbox" name="fatores_oficiais" defaultChecked={t?.fatores_oficiais ?? false} /> Fatores oficiais
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" name="ativo" defaultChecked={t?.ativo ?? true} /> Ativa
          </label>
        </div>
        {(["moto", "carro", "caminhao"] as const).map((c) => (
          <label key={c} className="block text-sm">
            <span className="text-ink-2">
              Fator {c === "caminhao" ? "caminhão" : c === "carro" ? "carro (pickup)" : "moto"}
              {t && <span className="ml-1 text-xs text-muted">= {porVeiculo(t[`fator_${c}`])}</span>}
            </span>
            <input name={`fator_${c}`} type="number" min="0.01" step="0.01" defaultValue={t?.[`fator_${c}`] ?? ""} placeholder="sem valor" className={`${inputCls} num`} />
          </label>
        ))}
        <label className="block text-sm sm:col-span-3">
          <span className="text-ink-2">Fonte (link do documento oficial)</span>
          <input name="fonte_url" type="url" defaultValue={t?.fonte_url ?? ""} className={inputCls} />
        </label>
        <label className="block text-sm sm:col-span-3">
          <span className="text-ink-2">Descrição da fonte (o seller vê este texto)</span>
          <textarea name="fonte_descricao" rows={2} defaultValue={t?.fonte_descricao ?? ""} className={inputCls} />
        </label>
      </div>
      <div className="flex items-center gap-3">
        <button type="submit" disabled={pending} className="rounded bg-aco-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
          {t ? "Salvar" : "Criar"}
        </button>
        {t && <span className="text-xs text-muted">Atualizada em {new Date(t.atualizado_em).toLocaleDateString("pt-BR")}</span>}
        {state.erro && <span className="text-sm text-erro">{state.erro}</span>}
        {state.ok && state.msg && <span className="text-sm text-ok">{state.msg}</span>}
      </div>
    </form>
  );
}
