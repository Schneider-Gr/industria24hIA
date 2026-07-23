"use client";

import { useActionState } from "react";
import { criarColetiva, participarColetiva, type ColetivaState } from "@/app/coletiva/actions";

const inicial: ColetivaState = { ok: true };

// Form "Criar compra coletiva" (página do produto).
export function FormCriarColetiva({
  produtoId,
  metaQtd,
}: {
  produtoId: string;
  metaQtd: number;
}) {
  const [state, action, pending] = useActionState(criarColetiva, inicial);
  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="produto_id" value={produtoId} />
      <label className="flex flex-col gap-1 text-xs text-[#7C7C7C]">
        Minha quantidade
        <input
          type="number"
          name="quantidade"
          min={1}
          max={metaQtd - 1}
          defaultValue={1}
          required
          className="num w-24 rounded border border-line px-2 py-1.5 text-sm text-ink"
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="rounded bg-aco-600 px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
      >
        {pending ? "Criando…" : "Criar compra coletiva"}
      </button>
      {state.error && <p className="w-full text-sm text-red-600">{state.error}</p>}
    </form>
  );
}

// Form "Participar" (página da coletiva).
export function FormParticipar({
  coletivaId,
  maxQtd,
}: {
  coletivaId: string;
  maxQtd: number;
}) {
  const [state, action, pending] = useActionState(participarColetiva, inicial);
  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="coletiva_id" value={coletivaId} />
      <label className="flex flex-col gap-1 text-xs text-[#7C7C7C]">
        Minha quantidade
        <input
          type="number"
          name="quantidade"
          min={1}
          max={maxQtd}
          defaultValue={1}
          required
          className="num w-24 rounded border border-line px-2 py-1.5 text-sm text-ink"
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="rounded bg-sinal px-4 py-2 text-sm font-semibold text-white hover:bg-sinal-escuro disabled:opacity-60"
      >
        {pending ? "Entrando…" : "Participar"}
      </button>
      {state.error && <p className="w-full text-sm text-red-600">{state.error}</p>}
    </form>
  );
}

// Barra de progresso volume atual vs meta (requisito HIGH do PRD).
export function BarraProgresso({ atual, meta }: { atual: number; meta: number }) {
  const pct = Math.min(100, Math.round((atual / meta) * 100));
  return (
    <div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-line">
        <div
          className="h-full rounded-full bg-verde-24h transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="num mt-1 text-xs text-[#7C7C7C]">
        {atual} de {meta} un ({pct}%)
      </p>
    </div>
  );
}
