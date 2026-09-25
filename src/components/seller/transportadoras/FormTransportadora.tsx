"use client";

import { useActionState } from "react";
import type { ResultadoForm } from "@/app/(seller)/seller/transportadoras/actions";

const inputCls =
  "w-full rounded border border-line bg-surface px-2 py-1 text-sm outline-none focus:border-roxo-800";

export type ValoresTransportadora = {
  id?: string;
  nome?: string;
  codigo_referencia?: string | null;
  peso_min?: number | null;
  peso_max?: number | null;
  valor_min?: number | null;
  valor_max?: number | null;
  altura_max?: number | null;
  largura_max?: number | null;
  comprimento_max?: number | null;
  fator_cubagem?: number | null;
  url_rastreio?: string | null;
  prazo_dias?: number | null;
};

function Campo({
  nome,
  rotulo,
  ajuda,
  valor,
  erro,
  tipo = "number",
  largura = "",
}: {
  nome: string;
  rotulo: string;
  ajuda?: string;
  valor?: string | number | null;
  erro?: string;
  tipo?: "number" | "text" | "url";
  largura?: string;
}) {
  return (
    <label className={`text-sm ${largura}`}>
      <span className="mb-1 block text-xs text-muted">{rotulo}</span>
      <input
        name={nome}
        type={tipo === "number" ? "text" : tipo}
        inputMode={tipo === "number" ? "decimal" : undefined}
        defaultValue={valor ?? ""}
        className={inputCls}
      />
      {ajuda && <span className="mt-0.5 block text-[11px] text-muted">{ajuda}</span>}
      {erro && <span className="mt-0.5 block text-xs text-red-600">{erro}</span>}
    </label>
  );
}

// Campos da transportadora formal (PRD 049 US01). Limite vazio = sem limite.
// Usado pelo seller (própria) e pelo admin (global), com a action de cada um.
export function FormTransportadora({
  action,
  valores = {},
  rotuloBotao = "Salvar",
  extra,
}: {
  action: (estado: ResultadoForm | null, fd: FormData) => Promise<ResultadoForm>;
  valores?: ValoresTransportadora;
  rotuloBotao?: string;
  extra?: React.ReactNode;
}) {
  const [estado, enviar, pendente] = useActionState(action, null);
  const e = estado?.erros ?? {};

  return (
    <form action={enviar} className="flex flex-col gap-3">
      {valores.id && <input type="hidden" name="id" value={valores.id} />}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Campo nome="nome" rotulo="Nome *" tipo="text" valor={valores.nome} erro={e.nome} />
        <Campo nome="codigo_referencia" rotulo="Código de referência" tipo="text" valor={valores.codigo_referencia} />
        <Campo
          nome="url_rastreio"
          rotulo="URL de rastreio"
          tipo="url"
          valor={valores.url_rastreio}
          erro={e.url_rastreio}
          ajuda="O código do envio é colocado no fim do endereço."
        />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Campo nome="peso_min" rotulo="Peso mínimo por envio (kg)" valor={valores.peso_min} erro={e.pesoMin} />
        <Campo nome="peso_max" rotulo="Peso máximo por envio (kg)" valor={valores.peso_max} erro={e.pesoMax} />
        <Campo nome="valor_min" rotulo="Valor mínimo dos produtos (R$)" valor={valores.valor_min} erro={e.valorMin} />
        <Campo nome="valor_max" rotulo="Valor máximo dos produtos (R$)" valor={valores.valor_max} erro={e.valorMax} />
        <Campo nome="altura_max" rotulo="Altura máxima (cm)" valor={valores.altura_max} erro={e.altura_max} />
        <Campo nome="largura_max" rotulo="Largura máxima (cm)" valor={valores.largura_max} erro={e.largura_max} />
        <Campo
          nome="comprimento_max"
          rotulo="Comprimento máximo (cm)"
          valor={valores.comprimento_max}
          erro={e.comprimento_max}
        />
        <Campo
          nome="fator_cubagem"
          rotulo="Fator de cubagem"
          valor={valores.fator_cubagem}
          erro={e.fatorCubagem}
          ajuda="Ex.: 6000 (aéreo/expresso) ou 300 kg/m³ (rodoviário). Obrigatório para subir tabela."
        />
      </div>
      <p className="text-[11px] text-muted">Deixe um limite em branco para &quot;sem limite&quot;.</p>
      {extra}
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pendente}
          className="rounded bg-roxo-800 px-4 py-1.5 text-sm font-semibold text-white hover:bg-roxo-900 disabled:opacity-50"
        >
          {pendente ? "Salvando…" : rotuloBotao}
        </button>
        {estado?.ok && <span className="text-xs text-muted">Salvo.</span>}
        {estado?.erro && <span className="text-xs text-red-600">{estado.erro}</span>}
      </div>
    </form>
  );
}
