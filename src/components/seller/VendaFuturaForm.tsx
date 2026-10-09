"use client";

import { useRef, useState } from "react";
import { criarVendaFutura } from "@/app/(seller)/seller/venda-futura/actions";
import { sugerirVendaFutura } from "@/app/(seller)/seller/venda-futura/ia-actions";
import { Dica } from "./Dica";
import Link from "next/link";
import { MAX_DEGRAUS, validarCurva, type Degrau } from "@/lib/venda-futura/preco-curva";

export function VendaFuturaForm({
  produtos,
  produtoInicial,
  curvaInicial = [],
}: {
  produtos: { id: string; nome: string; valor: number | null }[];
  /** vindo do simulador de preço (?produto=&curva=) */
  produtoInicial?: string;
  curvaInicial?: Degrau[];
}) {
  const formRef = useRef<HTMLFormElement>(null);
  // Teto nativo do campo valor (0211): a reserva nunca passa do preço à vista.
  // O erro do banco cairia na tela genérica de erro, o `max` barra antes.
  const [produtoId, setProdutoId] = useState(
    produtos.some((p) => p.id === produtoInicial) ? produtoInicial! : (produtos[0]?.id ?? ""),
  );
  const aVista = produtos.find((p) => p.id === produtoId)?.valor ?? undefined;
  const [iaPending, setIaPending] = useState(false);
  const [iaErro, setIaErro] = useState<string | null>(null);
  const [justificativa, setJustificativa] = useState<string | null>(null);
  const [motivo, setMotivo] = useState<string | null>(null);
  // PRD 061: curva por antecedência (até 3 degraus) e produção prevista.
  const [degraus, setDegraus] = useState<{ dias: string; pct: string }[]>(
    curvaInicial.map((d) => ({ dias: String(d.dias_antes), pct: String(d.desconto_pct) })),
  );
  const [producao, setProducao] = useState("");
  const curva: Degrau[] = degraus
    .filter((d) => d.dias !== "" && d.pct !== "")
    .map((d) => ({ dias_antes: Number(d.dias), desconto_pct: Number(d.pct) }));
  const erroCurva = validarCurva(curva);
  const mudarDegrau = (i: number, campo: "dias" | "pct", v: string) =>
    setDegraus((ds) => ds.map((d, j) => (j === i ? { ...d, [campo]: v } : d)));

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
        <select id="produto_id" name="produto_id" required value={produtoId} onChange={(e) => setProdutoId(e.target.value)} className="rounded border border-line px-3 py-2 text-sm">
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
        <Dica tela="venda-futura" campo="estoque" />
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
          max={aVista}
          step={0.01}
          disabled={curva.length > 0}
          title={curva.length > 0 ? "Com curva, o preço é o à vista menos o desconto do degrau" : undefined}
          placeholder={aVista != null ? `Até R$ ${Number(aVista).toFixed(2).replace(".", ",")} (à vista)` : "Valor do produto unitario"}
          className="rounded border border-line px-3 py-2 text-sm num"
        />
        <Dica tela="venda-futura" campo="valor" />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="previsao" className="text-[11px] uppercase tracking-wider text-muted font-medium">
          Disponibilidade
        </label>
        <input id="previsao" name="previsao" type="date" required className="rounded border border-line px-3 py-2 text-sm" />
        <Dica tela="venda-futura" campo="previsao" />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="producao_prevista" className="text-[11px] uppercase tracking-wider text-muted font-medium">
          Produção prevista
        </label>
        <input
          id="producao_prevista"
          name="producao_prevista"
          type="number"
          min={1}
          step={1}
          value={producao}
          onChange={(e) => setProducao(e.target.value)}
          placeholder="Quanto você vai produzir"
          className="rounded border border-line px-3 py-2 text-sm num"
        />
      </div>

      <fieldset className="sm:col-span-4 flex flex-col gap-2 rounded border border-line p-3">
        <legend className="px-1 text-[11px] uppercase tracking-wider text-muted font-medium">
          Desconto por antecedência (opcional)
        </legend>
        <p className="text-xs text-muted">
          Quem reserva mais cedo paga menos. Cada degrau vale a partir de N dias antes da entrega e soma com o desconto por
          volume do produto.
        </p>
        <input type="hidden" name="curva" value={JSON.stringify(curva)} />
        {degraus.map((d, i) => (
          <div key={i} className="flex flex-wrap items-center gap-2 text-sm">
            <span>A partir de</span>
            <input
              aria-label={`Dias antes da entrega, degrau ${i + 1}`}
              type="number"
              min={1}
              step={1}
              value={d.dias}
              onChange={(e) => mudarDegrau(i, "dias", e.target.value)}
              className="num w-20 rounded border border-line px-2 py-1"
            />
            <span>dias antes:</span>
            <input
              aria-label={`Desconto em %, degrau ${i + 1}`}
              type="number"
              min={1}
              max={90}
              step={1}
              value={d.pct}
              onChange={(e) => mudarDegrau(i, "pct", e.target.value)}
              className="num w-16 rounded border border-line px-2 py-1"
            />
            <span>% de desconto</span>
            <button
              type="button"
              onClick={() => setDegraus((ds) => ds.filter((_, j) => j !== i))}
              className="text-[13px] font-medium text-erro hover:underline"
            >
              Remover
            </button>
          </div>
        ))}
        {degraus.length < MAX_DEGRAUS && (
          <button
            type="button"
            onClick={() => setDegraus((ds) => [...ds, { dias: "", pct: "" }])}
            className="self-start rounded border border-line px-3 py-1 text-[13px] font-medium text-aco-600 hover:bg-aco-100"
          >
            + Adicionar degrau
          </button>
        )}
        {erroCurva && <p className="text-sm text-erro">{erroCurva}</p>}
        <p className="text-xs text-muted">
          Não sabe quanto desconto dar em cada prazo?{" "}
          <Link href={`/seller/simulador-preco?produto=${produtoId}`} className="font-semibold text-aco-600 underline underline-offset-2">
            Simule pelo seu custo e pelo frete
          </Link>
          .
        </p>
      </fieldset>

      <div className="sm:col-span-4 flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={!!erroCurva}
          className="rounded bg-sinal px-4 py-2 text-sm font-semibold text-white hover:bg-sinal-escuro disabled:opacity-50"
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
