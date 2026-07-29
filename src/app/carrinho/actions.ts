"use server";

import { cookies } from "next/headers";
import { createPublicClient } from "@/lib/supabase/public";
import { lerEnderecoCookie, lojaCobreCep, CEP_COOKIE, type FaixaCep } from "@/lib/cep";
import type { ItemCarrinho } from "@/components/carrinho/carrinho";

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
// categoria de algo já no carrinho, filtrados por cobertura de CEP
// (mesma regra de `lojaCobreCep` usada na página de produto/checkout).
// Prioriza a própria loja do item (upsell, sem frete extra) antes de
// outras lojas cobertas (cross-sell).
export async function buscarCrossSell(itens: ItemCarrinho[]): Promise<SugestaoCrossSell[]> {
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

  const { data: candidatos } = await supabase
    .from("produtos")
    .select("id, nome, valor, loja_id, categoria_id, status_produto")
    .in("categoria_id", categoriaIds as string[])
    .not("id", "in", `(${produtoIdsNoCarrinho.join(",")})`)
    .eq("status_produto", "Aprovado")
    .gt("valor", 0)
    .limit(24);

  if (!candidatos?.length) return [];

  const { data: lojas } = await supabase
    .from("lojas_vitrine")
    .select("id, nome");
  const nomeLoja = new Map((lojas ?? []).map((l) => [l.id, l.nome]));

  const { data: imagens } = await supabase
    .from("produto_imagens")
    .select("produto_id, url")
    .in(
      "produto_id",
      candidatos.map((p) => p.id),
    )
    .order("ordem", { ascending: true });
  const imgPorProduto = new Map<string, string>();
  for (const img of imagens ?? []) {
    if (!imgPorProduto.has(img.produto_id)) imgPorProduto.set(img.produto_id, img.url);
  }

  let faixasCep: FaixaCep[] = [];
  if (cep) {
    const { data } = await supabase
      .from("faixas_cep")
      .select("cep_inicial, cep_final, loja_id, ativo")
      .eq("ativo", true);
    faixasCep = (data ?? []) as FaixaCep[];
  }

  const sugestoes = candidatos
    .filter((p) => !cep || lojaCobreCep(faixasCep, p.loja_id, cep))
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

  return sugestoes.slice(0, 8);
}
