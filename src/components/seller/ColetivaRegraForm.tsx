"use client";

import { useState, useTransition } from "react";
import { salvarRegra } from "@/app/(seller)/seller/coletivas/actions";
import { sugerirRegraIA } from "@/app/(seller)/seller/coletivas/ia-actions";
import type { Lote } from "@/lib/coletiva";

export type ProdutoOpcao = { id: string; nome: string; valor: number; estoque_atual: number };
export type RegraExistente = {
  produto_id: string;
  ativo: boolean;
  meta_qtd: number | null;
  min_participantes: number;
  max_participantes: number | null;
  prazo_dias: number;
  lotes: Lote[];
  frete_conjunto: boolean;
};

const LOTE_VAZIO: Lote = { min_qtd: 0, valor_unitario: 0 };

// Configuração da compra coletiva por produto (migration 0076): meta, faixa de
// participantes, prazo e a curva de lotes progressivos. A validação dura
// (curva decrescente, desconto real, teto de 4 lotes) é do banco — aqui só
// montamos o form e mostramos o erro que ele devolver.
export function ColetivaRegraForm({
  produtos,
  regras,
}: {
  produtos: ProdutoOpcao[];
  regras: RegraExistente[];
}) {
  const [produtoId, setProdutoId] = useState(produtos[0]?.id ?? "");
  const regra = regras.find((r) => r.produto_id === produtoId);
  const produto = produtos.find((p) => p.id === produtoId);

  const [lotes, setLotes] = useState<Lote[]>(regra?.lotes?.length ? regra.lotes : [LOTE_VAZIO]);
  const [meta, setMeta] = useState<string>(regra?.meta_qtd?.toString() ?? "");
  const [minPart, setMinPart] = useState<string>(regra?.min_participantes?.toString() ?? "2");
  const [maxPart, setMaxPart] = useState<string>(regra?.max_participantes?.toString() ?? "");
  const [prazo, setPrazo] = useState<string>(regra?.prazo_dias?.toString() ?? "7");
  const [ativo, setAtivo] = useState(regra?.ativo ?? true);
  const [freteConjunto, setFreteConjunto] = useState(regra?.frete_conjunto ?? false);
  const [justificativa, setJustificativa] = useState<string | null>(null);
  const [erroIA, setErroIA] = useState<string | null>(null);
  const [pendingIA, startIA] = useTransition();

  // Troca de produto: recarrega o form com a regra desse produto.
  function trocarProduto(id: string) {
    setProdutoId(id);
    const r = regras.find((x) => x.produto_id === id);
    setLotes(r?.lotes?.length ? r.lotes : [LOTE_VAZIO]);
    setMeta(r?.meta_qtd?.toString() ?? "");
    setMinPart(r?.min_participantes?.toString() ?? "2");
    setMaxPart(r?.max_participantes?.toString() ?? "");
    setPrazo(r?.prazo_dias?.toString() ?? "7");
    setAtivo(r?.ativo ?? true);
    setFreteConjunto(r?.frete_conjunto ?? false);
    setJustificativa(null);
    setErroIA(null);
  }

  function sugerir() {
    setErroIA(null);
    setJustificativa(null);
    startIA(async () => {
      const r = await sugerirRegraIA(produtoId);
      if (!r.ok || !r.sugestao) {
        setErroIA(r.erros?.join(" ") ?? "A IA não conseguiu propor uma curva válida.");
        return;
      }
      setLotes(r.sugestao.lotes);
      setMeta(String(r.sugestao.meta_qtd));
      setMinPart(String(r.sugestao.min_participantes));
      setMaxPart(r.sugestao.max_participantes ? String(r.sugestao.max_participantes) : "");
      setPrazo(String(r.sugestao.prazo_dias));
      setJustificativa(r.sugestao.justificativa);
    });
  }

  if (produtos.length === 0) {
    return (
      <p className="text-sm text-muted">
        Cadastre um produto com preço antes de configurar uma compra coletiva.
      </p>
    );
  }

  return (
    <form action={salvarRegra} className="grid gap-4">
      <div className="grid gap-3 sm:grid-cols-3 sm:items-end">
        <div className="sm:col-span-2">
          <label htmlFor="produto_id" className="mb-1 block text-[12px] font-medium uppercase tracking-wider text-muted">
            Produto
          </label>
          <select
            id="produto_id"
            name="produto_id"
            value={produtoId}
            onChange={(e) => trocarProduto(e.target.value)}
            className="w-full rounded border border-line px-3 py-2 text-sm text-ink"
          >
            {produtos.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome}
              </option>
            ))}
          </select>
          {produto && (
            <p className="num mt-1 text-xs text-muted">
              Preço base R$ {produto.valor.toFixed(2)} · estoque {produto.estoque_atual} un
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={sugerir}
          disabled={pendingIA}
          className="rounded border border-line px-4 py-2 text-sm font-semibold text-ink hover:bg-surface disabled:opacity-60"
        >
          {pendingIA ? "Calculando…" : "Sugerir com IA"}
        </button>
      </div>

      {justificativa && (
        <p className="rounded border border-line bg-surface px-3 py-2 text-sm text-ink">
          <span className="font-semibold">Sugestão da IA:</span> {justificativa}{" "}
          <span className="text-muted">Revise e clique em salvar para aplicar.</span>
        </p>
      )}
      {erroIA && <p className="text-sm text-red-600">{erroIA}</p>}

      <div>
        <p className="mb-2 text-[12px] font-medium uppercase tracking-wider text-muted">
          Lotes de desconto progressivo
        </p>
        <div className="grid gap-2">
          {lotes.map((l, i) => (
            <div key={i} className="flex items-end gap-2">
              <label className="flex flex-col gap-1 text-xs text-muted">
                A partir de (un)
                <input
                  name="lote_qtd"
                  type="number"
                  min={1}
                  value={l.min_qtd || ""}
                  onChange={(e) =>
                    setLotes(
                      lotes.map((x, j) =>
                        j === i ? { ...x, min_qtd: Number(e.target.value) } : x,
                      ),
                    )
                  }
                  className="num w-28 rounded border border-line px-2 py-1.5 text-sm text-ink"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs text-muted">
                Preço unitário (R$)
                <input
                  name="lote_valor"
                  type="number"
                  min={0}
                  step={0.01}
                  value={l.valor_unitario || ""}
                  onChange={(e) =>
                    setLotes(
                      lotes.map((x, j) =>
                        j === i ? { ...x, valor_unitario: Number(e.target.value) } : x,
                      ),
                    )
                  }
                  className="num w-32 rounded border border-line px-2 py-1.5 text-sm text-ink"
                />
              </label>
              {lotes.length > 1 && (
                <button
                  type="button"
                  onClick={() => setLotes(lotes.filter((_, j) => j !== i))}
                  className="rounded border border-line px-2 py-1.5 text-xs text-muted hover:border-red-400 hover:text-red-600"
                >
                  Remover
                </button>
              )}
            </div>
          ))}
        </div>
        {lotes.length < 4 && (
          <button
            type="button"
            onClick={() => setLotes([...lotes, LOTE_VAZIO])}
            className="mt-2 rounded border border-line px-3 py-1 text-xs font-semibold text-ink hover:bg-surface"
          >
            + Adicionar lote
          </button>
        )}
        <p className="mt-2 text-xs text-muted">
          Quantidade crescente e preço sempre menor que o do lote anterior. Todos
          os participantes pagam o preço do melhor lote atingido no fechamento.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <label className="flex flex-col gap-1 text-xs text-muted">
          Meta (un) — vazio usa o 1º lote
          <input
            name="meta_qtd"
            type="number"
            min={1}
            value={meta}
            onChange={(e) => setMeta(e.target.value)}
            className="num rounded border border-line px-2 py-1.5 text-sm text-ink"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted">
          Mín. de participantes
          <input
            name="min_participantes"
            type="number"
            min={2}
            value={minPart}
            onChange={(e) => setMinPart(e.target.value)}
            className="num rounded border border-line px-2 py-1.5 text-sm text-ink"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted">
          Máx. de participantes (vazio = sem teto)
          <input
            name="max_participantes"
            type="number"
            min={2}
            value={maxPart}
            onChange={(e) => setMaxPart(e.target.value)}
            className="num rounded border border-line px-2 py-1.5 text-sm text-ink"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted">
          Prazo (dias)
          <input
            name="prazo_dias"
            type="number"
            min={1}
            max={30}
            value={prazo}
            onChange={(e) => setPrazo(e.target.value)}
            className="num rounded border border-line px-2 py-1.5 text-sm text-ink"
          />
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-5">
        <label className="flex items-center gap-2 text-sm text-ink">
          <input
            type="checkbox"
            name="ativo"
            checked={ativo}
            onChange={(e) => setAtivo(e.target.checked)}
          />
          Oferecer compra coletiva neste produto
        </label>
        <label className="flex items-center gap-2 text-sm text-ink">
          <input
            type="checkbox"
            name="frete_conjunto"
            checked={freteConjunto}
            onChange={(e) => setFreteConjunto(e.target.checked)}
          />
          Entrega conjunta (frete rateado entre os participantes)
        </label>
      </div>

      <button
        type="submit"
        className="w-fit rounded bg-sinal px-4 py-2 text-sm font-semibold text-white hover:bg-sinal-escuro"
      >
        Salvar regra
      </button>
    </form>
  );
}
