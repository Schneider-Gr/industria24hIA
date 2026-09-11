"use server";

import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { lerEnderecoCookie, CEP_COOKIE } from "@/lib/cep";
import { idsForaDaFaixaCep } from "@/lib/catalogo-compra/faixa-cep-produto";
import { primeiraImagemPorProduto } from "@/lib/catalogo-compra/vitrine-home";
import { montarRecompra, type ItemRecompra, type ProdutoRecompra } from "@/lib/catalogo-compra/recompra";

// "Comprar de novo" (change mobile-vitrine-densa-benchmark): lê as linhas do
// pedido e o estado ATUAL de cada produto, e deixa a regra de disponibilidade
// para `montarRecompra`. Client normal, não service role: a view
// `linha_itens_cliente` só devolve linhas dos pedidos do próprio comprador
// (0025), e produto/imagem/loja são leitura pública da vitrine. O checkout
// revalida preço e estoque no banco, como para qualquer carrinho.
export async function buscarRecompra(
  pedidoId: string,
): Promise<{ itens: ItemRecompra[]; indisponiveis: string[] }> {
  const supabase = await createClient();

  const { data: linhas } = await supabase
    .from("linha_itens_cliente")
    .select("produto_id, produto_nome, quantidade, venda_futura_id")
    .eq("pedido_id", pedidoId);

  const ids = [...new Set((linhas ?? []).map((l) => l.produto_id).filter((id): id is string => !!id))];
  if (ids.length === 0) {
    return { itens: [], indisponiveis: (linhas ?? []).map((l) => l.produto_nome ?? "Produto") };
  }

  const [{ data: produtos }, { data: imagens }] = await Promise.all([
    supabase
      .from("produtos")
      .select("id, nome, valor, quantidade_minima, loja_id, estoque_atual")
      .in("id", ids)
      .eq("status_produto", "Aprovado")
      .gt("valor", 0),
    supabase
      .from("produto_imagens")
      .select("produto_id, url, ordem")
      .in("produto_id", ids)
      .order("ordem", { ascending: true }),
  ]);

  const lojaIds = [...new Set((produtos ?? []).map((p) => p.loja_id))];
  const { data: lojas } = lojaIds.length
    ? await supabase.from("lojas_vitrine").select("id, nome").in("id", lojaIds)
    : { data: [] as { id: string | null; nome: string | null }[] };
  const nomeLoja = new Map((lojas ?? []).map((l) => [l.id, l.nome ?? ""]));
  const imagemPorProduto = primeiraImagemPorProduto(imagens ?? []);

  const atuais: ProdutoRecompra[] = (produtos ?? []).map((p) => ({
    id: p.id,
    nome: p.nome,
    valor: Number(p.valor),
    quantidade_minima: p.quantidade_minima,
    loja_id: p.loja_id,
    loja_nome: nomeLoja.get(p.loja_id) ?? "",
    img: imagemPorProduto.get(p.id) ?? null,
    estoque_atual: p.estoque_atual,
  }));

  const cep = lerEnderecoCookie((await cookies()).get(CEP_COOKIE)?.value)?.cep ?? null;
  const fora = await idsForaDaFaixaCep(ids, cep);

  return montarRecompra(linhas ?? [], atuais, fora);
}
