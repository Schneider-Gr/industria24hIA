"use client";

import { useActionState } from "react";
import { simularKm, type SimulacaoKmState } from "@/app/(seller)/seller/parceiro-logistica/actions";
import { PISO_KM_PADRAO } from "@/lib/logistica-parceiro/preco-km";

const inputCls =
  "mt-1 w-full rounded border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-aco-600";

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function SimuladorKm({ origemPadrao }: { origemPadrao: string }) {
  const [state, action, pending] = useActionState<SimulacaoKmState, FormData>(simularKm, { ok: false });
  const v = state.valores;

  return (
    <section className="mb-8 rounded-lg border border-line bg-surface p-6">
      <h2 className="text-base font-semibold text-ink">Simulador de preço por km rodado</h2>
      <p className="mt-1 text-sm text-muted">
        Distância real de carro pelo Google Maps, só a ida. O consumidor paga km × valor por km; piso de {brl(PISO_KM_PADRAO)} por km.
      </p>

      <form action={action} className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="text-ink-2">Origem (CEP ou endereço) *</span>
          <input name="origem" required defaultValue={v?.origem ?? origemPadrao} className={inputCls} />
        </label>
        <label className="block text-sm">
          <span className="text-ink-2">Destino (CEP ou endereço) *</span>
          <input name="destino" required defaultValue={v?.destino ?? ""} placeholder="69088-068 ou Rua, nº, bairro, cidade" className={inputCls} />
        </label>
        <label className="block text-sm">
          <span className="text-ink-2">Valor por km (R$) *</span>
          <input name="valor_km" type="number" min={PISO_KM_PADRAO} step="0.01" required defaultValue={v?.valorKm ?? PISO_KM_PADRAO.toFixed(2)} className={inputCls} />
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
          </p>
          <iframe
            src={state.embed}
            title="Rota no Google Maps"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            className="mt-3 aspect-video w-full rounded border border-line"
          />
        </div>
      )}
    </section>
  );
}
