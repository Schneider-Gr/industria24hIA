"use client";

import { useActionState } from "react";
import { simularKm, type SimulacaoKmState } from "@/app/(seller)/seller/produtos/km-actions";

const inputCls =
  "mt-1 w-full rounded border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-aco-600";

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function SimuladorKm({
  origemPadrao,
  piso,
  valorKmPadrao,
}: {
  origemPadrao: string;
  piso: number;
  valorKmPadrao: number;
}) {
  const [state, action, pending] = useActionState<SimulacaoKmState, FormData>(simularKm, { ok: false });
  const v = state.valores;

  return (
    <section className="rounded-lg border border-line p-4">
      <h3 className="text-sm font-semibold text-ink">Simular uma entrega</h3>
      <p className="mt-1 text-xs text-muted">
        Distância de carro pelo Google Maps, só a ida. O consumidor paga km × valor por km; piso da loja {brl(piso)} por km.
      </p>

      <form action={action} className="mt-3 grid gap-3 sm:grid-cols-2">
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
          <input name="valor_km" type="number" min={piso} step="0.01" required defaultValue={v?.valorKm ?? valorKmPadrao.toFixed(2)} className={inputCls} />
        </label>
        <div className="flex items-end">
          <button
            type="submit"
            disabled={pending}
            className="rounded bg-aco-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {pending ? "Calculando…" : "Simular"}
          </button>
        </div>
      </form>

      {!state.ok && state.erro && <p className="mt-3 text-sm text-erro">{state.erro}</p>}
      {state.ok && (
        <div className="mt-3 text-sm">
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
