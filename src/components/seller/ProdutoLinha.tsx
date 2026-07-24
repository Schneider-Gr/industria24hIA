"use client";

import { useState } from "react";
import type { Tables } from "@/lib/supabase/database.types";
import { ProdutoForm } from "@/components/seller/ProdutoForm";
import { ProdutoImagemCell } from "@/components/seller/ProdutoImagemCell";
import { formatBRL, formatData } from "@/components/seller/format";
import { excluirProduto, salvarValorMinimo, solicitarAprovacao } from "@/app/(seller)/seller/produtos/actions";

type Produto = Pick<
  Tables<"produtos">,
  | "id"
  | "nome"
  | "valor"
  | "quantidade_minima"
  | "estoque_atual"
  | "sku"
  | "cep_produto"
  | "status_produto"
  | "created_at"
  | "categoria_id"
  | "subcategoria_id"
  | "permite_afiliacao"
  | "porcentagem_afiliado"
  | "permite_logistica_afiliado"
  | "altura"
  | "comprimento"
  | "largura"
  | "peso"
  | "descricao"
  | "frete_gratis"
> & { produto_imagens: { url: string }[] };

export function ProdutoLinha({
  produto: p,
  loja,
  categorias,
  subcategorias,
  centros,
}: {
  produto: Produto;
  loja: { id: string };
  categorias: Pick<Tables<"categorias">, "id" | "nome">[];
  subcategorias: Pick<Tables<"subcategorias">, "id" | "nome" | "categoria_id">[];
  centros: Pick<Tables<"centros_distribuicao">, "id" | "nome">[];
}) {
  const [editando, setEditando] = useState(false);
  const critico = p.quantidade_minima != null && (p.estoque_atual ?? 0) < p.quantidade_minima;
  const podeReenviar = p.status_produto === "Recusado" || p.status_produto === "Em analise";

  if (editando) {
    return (
      <tr className="border-t border-line">
        <td colSpan={10} className="px-4 py-4">
          <ProdutoForm
            produto={p}
            categorias={categorias}
            subcategorias={subcategorias}
            centros={centros}
            onCancelarEdicao={() => setEditando(false)}
          />
        </td>
      </tr>
    );
  }

  return (
    <tr className="border-t border-line">
      <td className="px-4 py-2">
        <ProdutoImagemCell produtoId={p.id} lojaId={loja.id} currentUrl={p.produto_imagens[0]?.url} />
      </td>
      <td className="px-4 py-2 text-ink">{p.nome}</td>
      <td className="px-4 py-2 font-mono text-xs text-ink-2">{p.sku ?? "—"}</td>
      <td className="px-4 py-2 text-right num font-semibold text-ink">{formatBRL(p.valor)}</td>
      <td className={`px-4 py-2 text-right num ${critico ? "font-semibold text-warn" : "text-ink"}`}>
        {p.estoque_atual ?? 0}
      </td>
      <td className="px-4 py-2 text-right">
        <form action={salvarValorMinimo} className="flex items-center justify-end gap-1">
          <input type="hidden" name="id" value={p.id} />
          <input
            type="number"
            name="quantidade_minima"
            min={0}
            defaultValue={p.quantidade_minima ?? ""}
            className="w-16 rounded border border-line bg-surface px-1 py-0.5 text-right text-xs num"
            aria-label={`Valor mínimo de ${p.nome}`}
          />
          <button type="submit" className="rounded border border-line px-1.5 py-0.5 text-[11px] hover:bg-surface">
            Salvar
          </button>
        </form>
      </td>
      <td className="px-4 py-2 text-ink">{formatData(p.created_at)}</td>
      <td className="px-4 py-2 text-right num text-ink">{formatBRL((p.valor ?? 0) * (p.estoque_atual ?? 0))}</td>
      <td className="px-4 py-2 text-ink">{p.status_produto}</td>
      <td className="px-4 py-2 text-right">
        <div className="flex justify-end gap-1.5">
          <button
            type="button"
            onClick={() => setEditando(true)}
            className="rounded border border-line px-2 py-1 text-[11px] font-semibold text-ink-2 hover:bg-surface"
          >
            Editar
          </button>
          {podeReenviar && (
            <form action={solicitarAprovacao}>
              <input type="hidden" name="id" value={p.id} />
              <button
                type="submit"
                className="rounded border border-line px-2 py-1 text-[11px] font-semibold text-aco-600 hover:bg-surface"
              >
                Solicitar aprovação
              </button>
            </form>
          )}
          <form action={excluirProduto}>
            <input type="hidden" name="id" value={p.id} />
            <button
              type="submit"
              className="rounded border border-line px-2 py-1 text-[11px] font-semibold text-warn hover:bg-surface"
            >
              Excluir
            </button>
          </form>
        </div>
      </td>
    </tr>
  );
}
