"use client";

import { useState } from "react";
import type { Tables } from "@/lib/supabase/database.types";
import { estadoEstoque, rotuloEstado } from "@/lib/seller/estoque-estado";
import { ProdutoForm } from "@/components/seller/ProdutoForm";
import { ProdutoImagemCell } from "@/components/seller/ProdutoImagemCell";
import type { Bandas } from "@/lib/logistica-parceiro/simulador-km";
import { AviaoKm } from "@/components/seller/AviaoKm";
import { formatBRL, formatData } from "@/components/seller/format";
import { excluirProduto, salvarValorMinimo, solicitarAprovacao } from "@/app/(seller)/seller/produtos/actions";

type Produto = Pick<
  Tables<"produtos">,
  | "id"
  | "nome"
  | "valor"
  | "quantidade_minima"
  | "estoque_critico"
  | "estoque_atual"
  | "sku"
  | "cep_produto"
  | "raio_entrega_km"
  | "faixa_cep_id"
  | "status_produto"
  | "created_at"
  | "categoria_id"
  | "subcategoria_id"
  | "taxonomia_no_id"
  | "permite_afiliacao"
  | "porcentagem_afiliado"
  | "permite_logistica_afiliado"
  | "valor_km_afiliado"
  | "altura"
  | "comprimento"
  | "largura"
  | "peso"
  | "descricao"
  | "frete_gratis"
  | "perecivel"
> & {
  produto_imagens: { url: string }[];
  // 0095, fora de database.types.ts até a migration ser aplicada e os
  // tipos regenerados (supabase generate-types).
  parceiro_logistico_habilitado?: boolean;
  bandas: Bandas; // 0201
};

export function ProdutoLinha({
  produto: p,
  loja,
  categorias,
  subcategorias,
  centros,
  faixasCep,
  faixasDoProduto,
  temReserva = false,
}: {
  produto: Produto;
  loja: Pick<Tables<"lojas">, "id" | "cep">;
  categorias: Pick<Tables<"categorias">, "id" | "nome">[];
  subcategorias: Pick<Tables<"subcategorias">, "id" | "nome" | "categoria_id">[];
  centros: Pick<Tables<"centros_distribuicao">, "id" | "nome">[];
  faixasCep: Pick<Tables<"faixas_cep">, "id" | "cep_inicial" | "cep_final" | "nome">[];
  /** Regiões já declaradas para este produto (produto_faixas_cep, 0169). */
  faixasDoProduto: string[];
  /** Há venda futura com saldo? Esgotado com reserva continua na vitrine (0173). */
  temReserva?: boolean;
}) {
  const [editando, setEditando] = useState(false);
  const critico = estadoEstoque({ estoque_atual: p.estoque_atual, estoque_critico: p.estoque_critico }) === "critico";
  const dadosEstoque = {
    estoque_atual: p.estoque_atual,
    estoque_critico: p.estoque_critico,
    temReserva,
  };
  const estado = estadoEstoque(dadosEstoque);
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
            faixasCep={faixasCep}
            faixasDoProduto={faixasDoProduto}
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
      <td className="px-4 py-2 text-right">
        <span
          className={`num ${
            estado === "esgotado" ? "font-semibold text-erro" : critico ? "font-semibold text-warn" : "text-ink"
          }`}
        >
          {p.estoque_atual ?? 0}
        </span>
        {estado !== "normal" && (
          <span className="mt-0.5 block text-[10px] font-medium text-muted">{rotuloEstado(dadosEstoque)}</span>
        )}
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
          <AviaoKm produto={p} cepLoja={loja.cep} />
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
