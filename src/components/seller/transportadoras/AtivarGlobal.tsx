"use client";

import { useActionState } from "react";
import type { ResultadoForm } from "@/app/(seller)/seller/transportadoras/actions";

// Ativar global na loja (spec admin-transportadoras/transportadora-global):
// exige o código de cliente do seller na transportadora e o aceite de
// contrato, porque é o seller quem contrata e paga.
export function AtivarGlobal({
  transportadoraId,
  codigoAtual,
  action,
}: {
  transportadoraId: string;
  codigoAtual?: string | null;
  action: (estado: ResultadoForm | null, fd: FormData) => Promise<ResultadoForm>;
}) {
  const [estado, enviar, pendente] = useActionState(action, null);
  const e = estado?.erros ?? {};
  return (
    <form action={enviar} className="flex flex-wrap items-start gap-2 text-xs">
      <input type="hidden" name="transportadora_id" value={transportadoraId} />
      <label>
        <input
          name="codigo_cliente"
          defaultValue={codigoAtual ?? ""}
          placeholder="Seu código de cliente"
          className="w-40 rounded border border-line bg-surface px-2 py-1 text-xs outline-none focus:border-roxo-800"
        />
        {e.codigo_cliente && <span className="block text-red-600">{e.codigo_cliente}</span>}
      </label>
      <label className="flex max-w-56 items-start gap-1">
        <input type="checkbox" name="aceite" className="mt-0.5" />
        <span>
          Tenho contrato ativo com esta transportadora
          {e.aceite && <span className="block text-red-600">{e.aceite}</span>}
        </span>
      </label>
      <button
        type="submit"
        disabled={pendente}
        className="rounded bg-roxo-800 px-3 py-1 font-semibold text-white hover:bg-roxo-900 disabled:opacity-50"
      >
        {pendente ? "Ativando…" : "Ativar na loja"}
      </button>
      {estado?.erro && <span className="text-red-600">{estado.erro}</span>}
    </form>
  );
}
