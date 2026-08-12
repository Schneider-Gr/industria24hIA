"use server";

import { createClient } from "@/lib/supabase/server";
import { sugerirRegra, type ResultadoAgente, type ContextoProduto } from "@/lib/agentes/coletiva-precos";

// Sugestão de curva de lotes/meta/prazo para a compra coletiva de um produto.
// Monta o contexto REAL (preço, estoque, giro dos últimos 90 dias, coletivas
// anteriores) e passa ao grafo propor→validar→corrigir. Nada é gravado: o
// seller vê a justificativa e decide aplicar no form.
export async function sugerirRegraIA(produtoId: string): Promise<ResultadoAgente> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, erros: ["Sessão expirada."] };

  // Mesmo guard de dono das demais actions de produto.
  const { data: produto } = await supabase
    .from("produtos")
    .select("id, nome, valor, estoque_atual, lojas!inner(owner_id)")
    .eq("id", produtoId)
    .eq("lojas.owner_id", user.id)
    .maybeSingle();
  if (!produto) return { ok: false, erros: ["Produto não encontrado na sua loja."] };

  const desde = new Date(Date.now() - 90 * 86_400_000).toISOString();
  const { data: itens } = await supabase
    .from("linha_itens")
    .select("quantidade, pedidos!inner(data)")
    .eq("produto_id", produtoId)
    .gte("pedidos.data", desde);

  const quantidades = (itens ?? []).map((i) => Number(i.quantidade) || 0);
  const unidades = quantidades.reduce((s, q) => s + q, 0);

  const { data: anteriores } = await supabase
    .from("compras_coletivas")
    .select("meta_qtd, qtd_atual, status")
    .eq("produto_id", produtoId)
    .order("created_at", { ascending: false })
    .limit(5);

  const ctx: ContextoProduto = {
    nome: produto.nome,
    preco_base: Number(produto.valor),
    estoque_atual: Number(produto.estoque_atual ?? 0),
    unidades_vendidas_90d: unidades,
    pedidos_90d: quantidades.length,
    qtd_media_por_pedido: quantidades.length
      ? Math.round((unidades / quantidades.length) * 10) / 10
      : 0,
    coletivas_anteriores: (anteriores ?? []) as ContextoProduto["coletivas_anteriores"],
  };

  return sugerirRegra(ctx);
}
