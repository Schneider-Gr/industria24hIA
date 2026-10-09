"use server";

// Simulador de preço (change simulador-preco-quantidade-prazo): dados do produto para a
// simulação. Só lê; custo e economia ficam na tela.

import { getMinhaLoja } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { bandasDasColunas, COLUNAS_BANDAS, type Bandas, type ColunasBandas } from "@/lib/logistica-parceiro/simulador-km";

export type DadosSimuladorPreco =
  | {
      ok: true;
      valorAvista: number;
      comissaoPct: number;
      comissaoEstimada: boolean;
      pesoUnitKg: number | null;
      bandas: Bandas | null;
      qtdMinima: number | null;
    }
  | { ok: false; erro: string };

export async function dadosSimuladorPreco(produtoId: string): Promise<DadosSimuladorPreco> {
  const loja = await getMinhaLoja();
  if (!loja) return { ok: false, erro: "Entre com a conta da loja." };
  const supabase = await createClient();
  const [{ data: p }, { data: comissao, error: errComissao }] = await Promise.all([
    supabase
      .from("produtos")
      .select(`valor, peso, quantidade_minima, ${COLUNAS_BANDAS}`)
      .eq("id", produtoId)
      .eq("loja_id", loja.id)
      .maybeSingle(),
    supabase.rpc("comissao_pct_produto", { p_produto_id: produtoId }),
  ]);
  if (!p) return { ok: false, erro: "Produto não encontrado nesta loja." };
  const prod = p as unknown as { valor: number | null; peso: number | null; quantidade_minima: number | null } & Partial<ColunasBandas>;
  if (!(Number(prod.valor) > 0)) return { ok: false, erro: "Produto sem preço à vista." };
  const bandas = bandasDasColunas(prod);
  const temBanda = Object.values(bandas).some((b) => b.valorKm != null || b.tarifaMinima != null);
  const okComissao = !errComissao && comissao != null;
  return {
    ok: true,
    valorAvista: Number(prod.valor),
    comissaoPct: okComissao ? Number(comissao) : 5,
    comissaoEstimada: !okComissao,
    pesoUnitKg: Number(prod.peso) > 0 ? Number(prod.peso) : null,
    bandas: temBanda ? bandas : null,
    qtdMinima: prod.quantidade_minima,
  };
}
