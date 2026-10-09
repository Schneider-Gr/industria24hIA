"use server";

// Montador de faixas (change montador-faixas-custo-frete): dados do produto para a
// simulação e gravação das faixas. Usado em /seller/promocoes e /seller/venda-futura.

import { revalidatePath } from "next/cache";
import { getMinhaLoja } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/database.types";
import { bandasDasColunas, COLUNAS_BANDAS, type Bandas, type ColunasBandas } from "@/lib/logistica-parceiro/simulador-km";
import { faixasParaGravar, linhaMontador } from "@/lib/catalogo-compra/montador-faixas";
import type { Faixa } from "@/lib/preco-faixa";

export type DadosMontador =
  | {
      ok: true;
      valorAvista: number;
      comissaoPct: number;
      comissaoEstimada: boolean;
      pesoUnitKg: number | null;
      bandas: Bandas | null;
      qtdMinima: number | null;
      faixasAtuais: Faixa[];
    }
  | { ok: false; erro: string };

export async function dadosMontador(produtoId: string): Promise<DadosMontador> {
  const loja = await getMinhaLoja();
  if (!loja) return { ok: false, erro: "Entre com a conta da loja." };
  const supabase = await createClient();
  const [{ data: p }, { data: promo }, { data: comissao, error: errComissao }] = await Promise.all([
    supabase
      .from("produtos")
      .select(`valor, peso, quantidade_minima, ${COLUNAS_BANDAS}`)
      .eq("id", produtoId)
      .eq("loja_id", loja.id)
      .maybeSingle(),
    supabase.from("promocoes_progressivas").select("faixas").eq("produto_id", produtoId).eq("ativo", true).maybeSingle(),
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
    faixasAtuais: (Array.isArray(promo?.faixas) ? promo.faixas : []) as unknown as Faixa[],
  };
}

/** Substitui as faixas da promoção ativa (design D6). O preço é recalculado aqui a partir
 * do à vista: a tela só manda quantidade e desconto. */
export async function gravarFaixasMontador(
  produtoId: string,
  linhas: { qtd: number; descontoPct: number }[],
): Promise<{ ok: true; faixas: number } | { ok: false; erro: string }> {
  const loja = await getMinhaLoja();
  if (!loja) return { ok: false, erro: "Entre com a conta da loja." };
  if (!Array.isArray(linhas) || linhas.length > 10) return { ok: false, erro: "Faixas inválidas." };
  for (const l of linhas) {
    if (!Number.isInteger(l.qtd) || l.qtd < 1 || !Number.isInteger(l.descontoPct) || l.descontoPct < 0 || l.descontoPct > 90)
      return { ok: false, erro: "Cada faixa precisa de quantidade inteira e desconto inteiro de 0 a 90%." };
  }
  if (new Set(linhas.map((l) => l.qtd)).size !== linhas.length) return { ok: false, erro: "Há faixas com a mesma quantidade." };

  const supabase = await createClient();
  const { data: p } = await supabase.from("produtos").select("valor").eq("id", produtoId).eq("loja_id", loja.id).maybeSingle();
  if (!p || !(Number(p.valor) > 0)) return { ok: false, erro: "Produto não encontrado nesta loja." };
  const faixas = faixasParaGravar(
    linhas.map((l) =>
      linhaMontador({ valorAvista: Number(p.valor), comissaoPct: 0, pesoUnitKg: null, bandas: null, distanciasKm: [], custo: null, ...l }),
    ),
  );
  if (faixas.length === 0) return { ok: false, erro: "Dê desconto em pelo menos uma faixa acima de 1 un." };

  const { data: existente } = await supabase
    .from("promocoes_progressivas")
    .select("id")
    .eq("produto_id", produtoId)
    .eq("ativo", true)
    .maybeSingle();
  const { error } = existente
    ? await supabase.from("promocoes_progressivas").update({ faixas: faixas as unknown as Json[] }).eq("id", existente.id)
    : await supabase.from("promocoes_progressivas").insert({ produto_id: produtoId, faixas: faixas as unknown as Json[], ativo: true });
  if (error) return { ok: false, erro: `Não foi possível gravar as faixas: ${error.message}` };

  revalidatePath("/seller/promocoes");
  revalidatePath("/seller/venda-futura");
  return { ok: true, faixas: faixas.length };
}
