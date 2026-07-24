"use client";

import { useActionState } from "react";
import { criarColetiva, participarColetiva, type ColetivaState } from "@/app/coletiva/actions";

const inicial: ColetivaState = { ok: true };

// Form "Criar compra coletiva" (página do produto).
export function FormCriarColetiva({
  produtoId,
  metaQtd,
  freteConjunto = false,
}: {
  produtoId: string;
  metaQtd: number;
  freteConjunto?: boolean;
}) {
  const [state, action, pending] = useActionState(criarColetiva, inicial);
  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="produto_id" value={produtoId} />
      {freteConjunto && (
        <div className="grid w-full gap-2 sm:grid-cols-4">
          <p className="col-span-full text-xs text-[#7C7C7C]">
            Esta coletiva é entregue num endereço único, com o frete rateado entre
            os participantes por quantidade.
          </p>
          <input
            name="entrega_cep"
            required
            placeholder="CEP"
            className="num rounded border border-line px-2 py-1.5 text-sm text-ink"
          />
          <input
            name="entrega_rua"
            required
            placeholder="Rua"
            className="rounded border border-line px-2 py-1.5 text-sm text-ink sm:col-span-2"
          />
          <input
            name="entrega_numero"
            required
            placeholder="Número"
            className="num rounded border border-line px-2 py-1.5 text-sm text-ink"
          />
          <input
            name="entrega_bairro"
            placeholder="Bairro"
            className="rounded border border-line px-2 py-1.5 text-sm text-ink"
          />
          <input
            name="entrega_cidade"
            placeholder="Cidade"
            className="rounded border border-line px-2 py-1.5 text-sm text-ink"
          />
          <input
            name="entrega_complemento"
            placeholder="Complemento"
            className="rounded border border-line px-2 py-1.5 text-sm text-ink sm:col-span-2"
          />
        </div>
      )}
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
