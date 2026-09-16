"use server";

import { cookies } from "next/headers";
import { createPublicClient } from "@/lib/supabase/public";
import { idsEmRuptura, listaNotIn } from "@/lib/catalogo-compra/ruptura";
import { lerEnderecoCookie, CEP_COOKIE } from "@/lib/cep";
import { filtrarPorFaixaCep } from "@/lib/catalogo-compra/faixa-cep-produto";
import type { ItemCarrinho } from "@/components/carrinho/carrinho";
import type { Faixa } from "@/lib/preco-faixa";
import { ordenarPorGap } from "@/lib/carrinho/travas-minimas";
import type { SaldoProduto } from "@/lib/carrinho/disponibilidade";

export type SugestaoCrossSell = {
  id: string;
  nome: string;
  valor: number;
  loja_id: string;
  loja_nome: string;
  img: string | null;
  mesmaLoja: boolean;
};

// Sugestões de cross-sell/upsell para o carrinho: produtos da mesma
// categoria de algo já no carrinho, filtrados pela mesma regra de cobertura
// da vitrine (`filtrarPorFaixaCep`, migration 0169). O filtro por CEP estava
// documentado aqui mas não era aplicado — o cookie era lido e descartado, e o
// carrinho sugeria produto que não chega ao comprador.
// Prioriza a própria loja do item (upsell, sem frete extra) antes de
// outras lojas cobertas (cross-sell).
/** Filtro de desbloqueio: sugestoes de UMA loja, ordenadas pelo que falta para
 * o ticket minimo dela. Produto de outra loja nao desbloqueia aquele grupo. */
export type FiltroDesbloqueio = { lojaId: string; gap: number };

export async function buscarCrossSell(
  itens: ItemCarrinho[],
  desbloqueio?: FiltroDesbloqueio,
): Promise<SugestaoCrossSell[]> {
  if (itens.length === 0) return [];
  const supabase = createPublicClient();
  const cookieStore = await cookies();
  const cep = lerEnderecoCookie(cookieStore.get(CEP_COOKIE)?.value)?.cep ?? null;
  const produtoIdsNoCarrinho = itens.map((i) => i.produto_id);
  const lojaIdsNoCarrinho = new Set(itens.map((i) => i.loja_id));

  const { data: produtosNoCarrinho } = await supabase
    .from("produtos")
    .select("categoria_id")
    .in("id", produtoIdsNoCarrinho);

  const categoriaIds = [...new Set((produtosNoCarrinho ?? []).map((p) => p.categoria_id).filter(Boolean))];
  if (categoriaIds.length === 0) return [];

  // Sugerir produto em ruptura no carrinho é o pior lugar possível: o
  // comprador adiciona e só descobre no pagamento (0173).
  const ruptura = await idsEmRuptura(supabase);
  const excluidos = [...produtoIdsNoCarrinho, ...ruptura];
  const { data: candidatos } = await supabase
    .from("produtos")
    .select("id, nome, valor, loja_id, categoria_id, status_produto")
    .in("categoria_id", categoriaIds as string[])
    .not("id", "in", listaNotIn(excluidos))
    .eq("status_produto", "Aprovado")
    .gt("valor", 0)
    .limit(24);

  if (!candidatos?.length) return [];

  const candidatosDoEscopo = desbloqueio
    ? (candidatos ?? []).filter((p) => p.loja_id === desbloqueio.lojaId)
    : candidatos;
  if (!candidatosDoEscopo?.length) return [];

  const cobertos = await filtrarPorFaixaCep(candidatosDoEscopo, cep);
  if (cobertos.length === 0) return [];

  const { data: lojas } = await supabase
    .from("lojas_vitrine")
    .select("id, nome");
  const nomeLoja = new Map((lojas ?? []).map((l) => [l.id, l.nome]));

  const { data: imagens } = await supabase
    .from("produto_imagens")
    .select("produto_id, url")
    .in(
      "produto_id",
      cobertos.map((p) => p.id),
    )
    .order("ordem", { ascending: true });
  const imgPorProduto = new Map<string, string>();
  for (const img of imagens ?? []) {
    if (!imgPorProduto.has(img.produto_id)) imgPorProduto.set(img.produto_id, img.url);
  }

  const sugestoes = cobertos
    .map((p) => ({
      id: p.id,
      nome: p.nome,
      valor: Number(p.valor),
      loja_id: p.loja_id,
      loja_nome: nomeLoja.get(p.loja_id) ?? "—",
      img: imgPorProduto.get(p.id) ?? null,
      mesmaLoja: lojaIdsNoCarrinho.has(p.loja_id),
    }))
    // upsell (mesma loja) primeiro, depois cross-sell (outras lojas cobertas)
    .sort((a, b) => Number(b.mesmaLoja) - Number(a.mesmaLoja));

  return (desbloqueio ? ordenarPorGap(sugestoes, desbloqueio.gap) : sugestoes).slice(0, 8);
}

/** Minimos das lojas e faixas dos produtos do carrinho, lidos do servidor: o
 * `localStorage` e pista, nunca autoridade (carrinho antigo pode ter sido
 * montado antes de o seller cadastrar o ticket ou elevar a quantidade minima).
 * O banco continua reavaliando tudo em `checkout_criar_pedido`. */
export type TravasMinimas = {
  ticketPorLoja: Record<string, number | null>;
  faixasPorProduto: Record<string, Faixa[]>;
  quantidadeMinimaPorProduto: Record<string, number | null>;
  /** Saldo real por produto: à vista e em reserva. Ausente = produto sumiu do
   * catálogo, tratado como ruptura em `avaliarDisponibilidade`. */
  saldoPorProduto: Record<string, SaldoProduto>;
};

export async function carregarTravasMinimas(itens: ItemCarrinho[]): Promise<TravasMinimas> {
  const vazio: TravasMinimas = {
    ticketPorLoja: {},
    faixasPorProduto: {},
    quantidadeMinimaPorProduto: {},
    saldoPorProduto: {},
  };
  if (itens.length === 0) return vazio;

  const supabase = createPublicClient();
  const lojaIds = [...new Set(itens.map((i) => i.loja_id))];
  const produtoIds = [...new Set(itens.map((i) => i.produto_id))];

  const [{ data: lojas }, { data: produtos }, { data: promocoes }, { data: reservas }] =
    await Promise.all([
      supabase.from("lojas_vitrine").select("id, valor_pedido_minimo").in("id", lojaIds),
      supabase.from("produtos").select("id, quantidade_minima, estoque_atual").in("id", produtoIds),
      supabase
        .from("promocoes_progressivas")
        .select("produto_id, faixas")
        .in("produto_id", produtoIds)
        .eq("ativo", true),
      // Reserva viva: a mesma condição que a home usa para o Mercado Futuro.
      supabase
        .from("vendas_futuras")
        .select("produto_id, estoque, previsao")
        .in("produto_id", produtoIds)
        .gt("estoque", 0)
        .order("previsao", { ascending: true }),
    ]);

  const saldoPorProduto: Record<string, SaldoProduto> = {};
  for (const p of produtos ?? []) {
    saldoPorProduto[p.id] = {
      estoque: Number(p.estoque_atual ?? 0),
      reservaEstoque: 0,
      reservaPrevisao: null,
    };
  }
  for (const vf of reservas ?? []) {
    const saldo = saldoPorProduto[vf.produto_id];
    if (!saldo) continue;
    saldo.reservaEstoque += Number(vf.estoque ?? 0);
    // Consulta ordenada por previsão: a primeira que chega é a mais próxima.
    if (!saldo.reservaPrevisao) saldo.reservaPrevisao = vf.previsao;
  }

  return {
    ticketPorLoja: Object.fromEntries(
      (lojas ?? []).map((l) => [
        l.id,
        l.valor_pedido_minimo == null ? null : Number(l.valor_pedido_minimo),
      ]),
    ),
    quantidadeMinimaPorProduto: Object.fromEntries(
      (produtos ?? []).map((p) => [p.id, p.quantidade_minima]),
    ),
    faixasPorProduto: Object.fromEntries(
      (promocoes ?? []).map((p) => [
        p.produto_id,
        (Array.isArray(p.faixas) ? p.faixas : []) as unknown as Faixa[],
      ]),
    ),
    saldoPorProduto,
  };
}
