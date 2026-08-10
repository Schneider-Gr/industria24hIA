"use client";

import { useRef, useState } from "react";
import { criarVendaFutura } from "@/app/(seller)/seller/venda-futura/actions";
import { sugerirVendaFutura } from "@/app/(seller)/seller/venda-futura/ia-actions";

export function VendaFuturaForm({ produtos }: { produtos: { id: string; nome: string }[] }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [iaPending, setIaPending] = useState(false);
  const [iaErro, setIaErro] = useState<string | null>(null);
  const [justificativa, setJustificativa] = useState<string | null>(null);
  const [motivo, setMotivo] = useState<string | null>(null);

  async function sugerir() {
    const form = formRef.current;
    if (!form) return;
    const produtoId = (form.elements.namedItem("produto_id") as HTMLSelectElement | null)?.value;
    if (!produtoId) return;

    setIaErro(null);
    setJustificativa(null);
    setMotivo(null);
    setIaPending(true);
    const r = await sugerirVendaFutura(produtoId);
    setIaPending(false);
    if (!r.ok) {
      setIaErro(r.error ?? "Falha ao gerar sugestão.");
      return;
    }

    const estoque = form.elements.namedItem("estoque") as HTMLInputElement | null;
    const valor = form.elements.namedItem("valor") as HTMLInputElement | null;
    const previsao = form.elements.namedItem("previsao") as HTMLInputElement | null;
    if (estoque && r.estoque != null) estoque.value = String(r.estoque);
    if (valor && r.valor != null) valor.value = String(r.valor);
    if (previsao && r.previsao) previsao.value = r.previsao;
    setJustificativa(r.justificativa ?? null);
    setMotivo(r.motivo ?? null);
  }

  const motivoLabel: Record<string, string> = {
    sazonalidade_conhecida: "Sazonalidade agrícola",
    intervalo_historico: "Baseado no histórico",
    sem_base_conservador: "Estimativa conservadora (sem histórico)",
  };

  return (
    <form
      ref={formRef}
      action={criarVendaFutura}
      className="grid grid-cols-1 gap-3 sm:grid-cols-4 sm:items-end"
    >
      <div className="flex flex-col gap-1 sm:col-span-2">
        <label htmlFor="produto_id" className="text-[11px] uppercase tracking-wider text-muted font-medium">
          Produto
        </label>
        <select id="produto_id" name="produto_id" required className="rounded border border-line px-3 py-2 text-sm">
          {produtos.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nome}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="estoque" className="text-[11px] uppercase tracking-wider text-muted font-medium">
          Estoque
        </label>
        <input
          id="estoque"
          name="estoque"
          type="number"
          min={0}
          required
          placeholder="Quantidade produto"
          className="rounded border border-line px-3 py-2 text-sm num"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="valor" className="text-[11px] uppercase tracking-wider text-muted font-medium">
          Valor
        </label>
        <input
          id="valor"
          name="valor"
          type="number"
          min={0}
          step={0.01}
          placeholder="Valor do produto unitario"
          className="rounded border border-line px-3 py-2 text-sm num"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="previsao" className="text-[11px] uppercase tracking-wider text-muted font-medium">
          Disponibilidade
        </label>
        <input id="previsao" name="previsao" type="date" required className="rounded border border-line px-3 py-2 text-sm" />
      </div>

      <div className="sm:col-span-4 flex flex-wrap items-center gap-3">
        <button
          type="submit"
          className="rounded bg-sinal px-4 py-2 text-sm font-semibold text-white hover:bg-sinal-escuro"
        >
          Registrar venda futura
        </button>
        <button
          type="button"
          onClick={sugerir}
          disabled={iaPending}
          className="rounded border border-aco-800 px-4 py-2 text-sm font-semibold text-aco-600 hover:bg-aco-100 disabled:opacity-50"
        >
          {iaPending ? "Gerando..." : "IA: sugerir estoque, valor e data"}
        </button>
        {iaErro && <span className="text-sm text-erro">{iaErro}</span>}
      </div>

      {justificativa && (
        <p className="sm:col-span-4 text-xs text-muted">
          {motivo && (
            <span className="mr-1 rounded bg-aco-100 px-1.5 py-0.5 font-semibold text-aco-800">
              {motivoLabel[motivo] ?? motivo}
            </span>
          )}
          Sugestão da IA: {justificativa} — revise os campos antes de registrar.
        </p>
      )}
    </form>
  );
}
