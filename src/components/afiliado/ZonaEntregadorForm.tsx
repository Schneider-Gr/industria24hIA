"use client";

import { useActionState, useState } from "react";
import {
  salvarZonaEntregador,
  type ZonaEntregadorState,
} from "@/app/(afiliado)/afiliado/logistica/configuracoes/actions";
import { BAIRROS_MANAUS } from "@/lib/logistica-parceiro/bairros-manaus";

// Campos controlados: o React 19 limpa o form depois da action e a marcação sumiria.
export function ZonaEntregadorForm({ bairros, prefixos }: { bairros: string[]; prefixos: string[] }) {
  const [state, action, pending] = useActionState<ZonaEntregadorState, FormData>(salvarZonaEntregador, { ok: false });
  const [marcados, setMarcados] = useState(() => new Set(bairros));
  const [texto, setTexto] = useState(prefixos.join(", "));

  function alternar(b: string) {
    setMarcados((atual) => {
      const novo = new Set(atual);
      if (!novo.delete(b)) novo.add(b);
      return novo;
    });
  }

  const semZona = marcados.size === 0 && texto.trim() === "";

  return (
    <form action={action} className="space-y-4 rounded-lg border border-line bg-surface p-6">
      <div>
        <h2 className="text-base font-semibold text-ink">Onde você entrega</h2>
        <p className="mt-1 text-sm text-ink-2">
          Marque os bairros de Manaus que você atende. Você só recebe com exclusividade as corridas para esses
          destinos. Sem nada marcado, você recebe corridas para qualquer endereço.
        </p>
      </div>

      <fieldset>
        <legend className="text-sm text-ink-2">
          Bairros ({marcados.size} de {BAIRROS_MANAUS.length} marcados)
        </legend>
        <div className="mt-2 grid max-h-80 grid-cols-1 gap-x-4 gap-y-1 overflow-y-auto rounded border border-line p-3 sm:grid-cols-2">
          {BAIRROS_MANAUS.map((b) => (
            <label key={b} className="flex min-h-9 items-center gap-2 text-sm text-ink">
              <input
                type="checkbox"
                name="bairro"
                value={b}
                checked={marcados.has(b)}
                onChange={() => alternar(b)}
                className="size-4"
              />
              {b}
            </label>
          ))}
        </div>
      </fieldset>

      <label className="block text-sm">
        <span className="text-ink-2">Prefixos de CEP (5 primeiros dígitos, separados por vírgula)</span>
        <input
          name="prefixos"
          inputMode="numeric"
          placeholder="69050, 69005"
          value={texto}
          onChange={(e) => setTexto(e.currentTarget.value)}
          className="mt-1 w-full rounded border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-aco-600"
        />
      </label>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded bg-aco-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {pending ? "Salvando…" : "Salvar zona"}
        </button>
        {state.erro && (
          <span role="alert" className="text-sm text-erro">
            {state.erro}
          </span>
        )}
        {state.ok && (
          <span role="status" className="text-sm text-ok">
            {semZona ? "Zona apagada: você recebe corridas para qualquer endereço." : "Zona salva."}
          </span>
        )}
      </div>
    </form>
  );
}
