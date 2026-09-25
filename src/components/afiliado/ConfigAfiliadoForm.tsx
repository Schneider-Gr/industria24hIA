"use client";

import { useActionState, useRef } from "react";
import {
  salvarConfigAfiliado,
  type ConfigAfiliadoState,
} from "@/app/(afiliado)/afiliado/logistica/configuracoes/actions";
import { buscarEndereco } from "@/lib/cep";

const inputCls =
  "mt-1 w-full rounded border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-aco-600";

type Atual = {
  nome: string;
  cep_base: string | null;
  cidade: string | null;
  bairro: string | null;
  numero: string | null;
  telefone: string | null;
  veiculo: string | null;
  capacidade_kg: number | null;
  valor_minimo_entrega: number | null;
} | null;

export function ConfigAfiliadoForm({ atual, nomePadrao }: { atual: Atual; nomePadrao: string }) {
  const [state, action, pending] = useActionState<ConfigAfiliadoState, FormData>(salvarConfigAfiliado, { ok: false });
  const cidade = useRef<HTMLInputElement>(null);
  const bairro = useRef<HTMLInputElement>(null);

  // Como no Bubble: cidade e bairro se preenchem pelo CEP (ViaCEP, já liberado na CSP).
  async function aoSairDoCep(cep: string) {
    const e = await buscarEndereco(cep).catch(() => null);
    if (!e) return;
    if (cidade.current && e.cidade) cidade.current.value = e.cidade;
    if (bairro.current && e.bairro) bairro.current.value = e.bairro;
  }

  return (
    <form action={action} className="grid gap-4 rounded-lg border border-line bg-surface p-6 sm:grid-cols-2">
      <label className="block text-sm sm:col-span-2">
        <span className="text-ink-2">Nome *</span>
        <input name="nome" required defaultValue={atual?.nome ?? nomePadrao} className={inputCls} />
      </label>
      <label className="block text-sm">
        <span className="text-ink-2">Endereço CEP *</span>
        <input
          name="cep"
          required
          inputMode="numeric"
          defaultValue={atual?.cep_base ?? ""}
          onBlur={(e) => aoSairDoCep(e.currentTarget.value)}
          className={inputCls}
        />
      </label>
      <label className="block text-sm">
        <span className="text-ink-2">Cidade *</span>
        <input ref={cidade} name="cidade" required defaultValue={atual?.cidade ?? ""} className={inputCls} />
      </label>
      <label className="block text-sm">
        <span className="text-ink-2">Bairro *</span>
        <input ref={bairro} name="bairro" required defaultValue={atual?.bairro ?? ""} className={inputCls} />
      </label>
      <label className="block text-sm">
        <span className="text-ink-2">Nº</span>
        <input name="numero" defaultValue={atual?.numero ?? ""} className={inputCls} />
      </label>
      <label className="block text-sm">
        <span className="text-ink-2">Número de telefone *</span>
        <input name="telefone" required type="tel" defaultValue={atual?.telefone ?? ""} className={inputCls} />
      </label>
      <label className="block text-sm">
        <span className="text-ink-2">Veículo</span>
        <input name="veiculo" placeholder="Moto, carro, van, caminhão…" defaultValue={atual?.veiculo ?? ""} className={inputCls} />
      </label>
      <label className="block text-sm">
        <span className="text-ink-2">Peso suportado em kg</span>
        <input name="peso" type="number" min="0" step="0.01" defaultValue={atual?.capacidade_kg ?? ""} className={inputCls} />
      </label>
      <label className="block text-sm">
        <span className="text-ink-2">Valor mínimo para entrega (R$)</span>
        <input name="minimo" type="number" min="0" step="0.01" defaultValue={atual?.valor_minimo_entrega ?? ""} className={inputCls} />
      </label>
      <div className="flex items-center gap-3 sm:col-span-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded bg-aco-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {pending ? "Salvando…" : "Salvar"}
        </button>
        {state.erro && <span className="text-sm text-erro">{state.erro}</span>}
        {state.ok && <span className="text-sm text-ok">Configurações salvas.</span>}
      </div>
    </form>
  );
}
