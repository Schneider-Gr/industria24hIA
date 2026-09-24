"use client";

import { useActionState } from "react";
import { simularKm, type SimulacaoKmState } from "@/app/(seller)/seller/parceiro-logistica/actions";

const inputCls =
  "mt-1 w-full rounded border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-aco-600";

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function SimuladorKm({ origemPadrao }: { origemPadrao: string }) {
  const [state, action, pending] = useActionState<SimulacaoKmState, FormData>(simularKm, { ok: false });

  return (
    <section className="mb-8 rounded-lg border border-line bg-surface p-6">
      <h2 className="text-base font-semibold text-ink">Simulador de preço por km rodado</h2>
      <p className="mt-1 text-sm text-muted">
        Distância real de carro pelo Google Maps. Use para combinar o valor com o afiliado logístico.
      </p>

      <form action={action} className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="text-ink-2">Origem (CEP ou endereço) *</span>
          <input name="origem" required defaultValue={origemPadrao} className={inputCls} />
        </label>
        <label className="block text-sm">
          <span className="text-ink-2">Destino (CEP ou endereço) *</span>
          <input name="destino" required placeholder="69088-068 ou Rua, nº, bairro, cidade" className={inputCls} />
        </label>
        <label className="block text-sm">
          <span className="text-ink-2">Valor por km (R$) *</span>
          <input name="valor_km" type="number" min="0.01" step="0.01" required defaultValue="2.00" className={inputCls} />
        </label>
        <label className="block text-sm">
          <span className="text-ink-2">Valor mínimo da entrega (R$)</span>
          <input name="minimo" type="number" min="0" step="0.01" defaultValue="0" className={inputCls} />
        </label>
        <label className="flex items-center gap-2 text-sm text-ink-2 sm:col-span-2">
          <input name="ida_volta" type="checkbox" /> Cobrar ida e volta
        </label>
        <div className="sm:col-span-2">
          <button
            type="submit"
            disabled={pending}
            className="rounded bg-aco-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {pending ? "Calculando…" : "Simular"}
          </button>
        </div>
      </form>

      {!state.ok && state.erro && <p className="mt-4 text-sm text-erro">{state.erro}</p>}
      {state.ok && (
        <div className="mt-4 rounded border border-line p-4 text-sm">
          <p className="text-2xl font-semibold text-ink">{brl(state.preco)}</p>
          <p className="mt-1 text-ink-2">
            {state.km.toLocaleString("pt-BR")} km · cerca de {state.minutos} min de carro
            {state.kmCobrados !== state.km && ` · ${state.kmCobrados.toLocaleString("pt-BR")} km cobrados (ida e volta)`}
          </p>
          {state.aplicouMinimo && <p className="mt-1 text-muted">Aplicado o valor mínimo da entrega.</p>}
          <a href={state.link} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-aco-600 underline">
            Ver rota no Google Maps
          </a>
        </div>
      )}
    </section>
  );
}
