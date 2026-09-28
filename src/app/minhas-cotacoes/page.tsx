import Link from "next/link";
import { redirect } from "next/navigation";
import { VitrineHeader, VitrineFooter } from "@/components/vitrine/ui";
import { createClient } from "@/lib/supabase/server";
import { formatBRL } from "@/components/seller/format";
import { formatarCep } from "@/lib/cep";
import type { ItemCarrinho } from "@/components/carrinho/carrinho";
import {
  dataHoraCurta,
  mensagemStatusCotacao,
  ordenarCotacoes,
  textoPrazoCotacao,
  textoValorCotacao,
} from "@/lib/catalogo-compra/cotacao-frete";
import { cancelarCotacaoFrete } from "@/app/cotacoes-frete/actions";
import { BotaoComprarComFrete } from "./BotaoComprarComFrete";

export const dynamic = "force-dynamic";
export const metadata = { title: "Minhas cotações" };

type Item = { produto_id: string; quantidade: number };

// Cotações de frete do comprador (PRD 050, US07): um lugar só para achar a
// resposta do vendedor e comprar com ela, sem depender do e-mail.
export default async function MinhasCotacoesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/minhas-cotacoes");

  const { data: cotacoes } = await supabase
    .from("cotacoes_frete_vendedor")
    .select(
      "id, status, criado_em, responder_ate, valida_ate, valor_centavos, valor_carrinho_centavos, prazo_min, prazo_max, itens, itens_carrinho, loja_id, cep_destino, bairro_destino, cidade_destino, produto_id, pedido_id",
    )
    .eq("comprador_id", user.id)
    .not("status", "in", "(substituida,cancelada)")
    .order("criado_em", { ascending: false })
    .limit(100);

  const lista = ordenarCotacoes(cotacoes ?? []);
  const itensDe = (j: unknown) => (Array.isArray(j) ? (j as Item[]) : []);
  const produtoIds = [...new Set(lista.flatMap((c) => [...itensDe(c.itens), ...itensDe(c.itens_carrinho)]).map((i) => i.produto_id))];
  const lojaIds = [...new Set(lista.map((c) => c.loja_id))];
  const pedidoIds = lista.map((c) => c.pedido_id).filter((v): v is string => Boolean(v));

  const [{ data: produtos }, { data: lojas }, { data: pedidos }] = await Promise.all([
    produtoIds.length
      ? supabase
          .from("produtos")
          .select("id, nome, valor, quantidade_minima, loja_id, status_produto, estoque_atual, produto_imagens(url)")
          .in("id", produtoIds)
      : Promise.resolve({ data: [] }),
    lojaIds.length ? supabase.from("lojas_vitrine").select("id, nome").in("id", lojaIds) : Promise.resolve({ data: [] }),
    pedidoIds.length
      ? supabase.from("pedidos_cliente").select("id, id_venda").in("id", pedidoIds)
      : Promise.resolve({ data: [] }),
  ]);
  const produto = new Map((produtos ?? []).map((p) => [p.id, p]));
  const lojaNome = new Map((lojas ?? []).map((l) => [l.id as string, l.nome as string]));
  const idVenda = new Map((pedidos ?? []).map((p) => [p.id as string, p.id_venda as string]));

  const paraCarrinho = (itens: Item[], lojaId: string): ItemCarrinho[] | null => {
    const out: ItemCarrinho[] = [];
    for (const i of itens) {
      const p = produto.get(i.produto_id);
      if (!p || p.status_produto !== "Aprovado" || (p.estoque_atual ?? 0) < i.quantidade) return null;
      out.push({
        produto_id: p.id,
        nome: p.nome,
        valor: Number(p.valor),
        quantidade: i.quantidade,
        quantidade_minima: p.quantidade_minima,
        loja_id: lojaId,
        loja_nome: lojaNome.get(lojaId) ?? "",
        img: (p.produto_imagens as { url: string }[] | null)?.[0]?.url ?? null,
      });
    }
    return out;
  };

  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <VitrineHeader />
      <main className="mx-auto w-full max-w-[720px] flex-1 px-4 py-8 pb-24 sm:px-6">
        <h1 className="mb-1 font-display text-2xl font-bold text-ink">Minhas cotações de frete</h1>
        <p className="mb-4 text-sm text-muted">
          Fretes que você pediu aos vendedores. Com a resposta, você compra produto e frete juntos.
        </p>

        {lista.length === 0 ? (
          <div className="rounded border border-dashed border-line bg-white p-10 text-center text-sm text-muted">
            Nenhuma cotação ainda. Nos produtos com &ldquo;Combine a entrega com o vendedor&rdquo;, peça o frete e a
            resposta aparece aqui.
          </div>
        ) : (
          <ul className="space-y-3">
            {lista.map((c) => {
              const itens = itensDe(c.itens);
              const itensCarrinho = itensDe(c.itens_carrinho);
              const carrinho = c.efetivo === "respondida" ? paraCarrinho(itens, c.loja_id) : null;
              const carrinhoTudo =
                c.efetivo === "respondida" && c.valor_carrinho_centavos != null
                  ? paraCarrinho([...itens, ...itensCarrinho], c.loja_id)
                  : null;
              const mensagem = mensagemStatusCotacao({ status: c.efetivo, responder_ate: c.responder_ate });
              return (
                <li key={c.id} className="rounded border border-line bg-white p-4 text-sm">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="font-semibold text-ink">{lojaNome.get(c.loja_id) ?? "Loja"}</p>
                    <p className="text-[12px] text-muted">Pedida em {dataHoraCurta(c.criado_em)}</p>
                  </div>
                  <ul className="mt-1 text-ink-2">
                    {itens.map((i) => (
                      <li key={i.produto_id}>
                        {i.quantidade}× {produto.get(i.produto_id)?.nome ?? "Produto"}
                      </li>
                    ))}
                  </ul>
                  <p className="mt-1 text-[12px] text-muted">
                    Entrega: {[c.bairro_destino, c.cidade_destino].filter(Boolean).join(", ")} (CEP{" "}
                    {formatarCep(c.cep_destino)})
                  </p>

                  {c.efetivo === "respondida" && c.valor_centavos != null ? (
                    <div className="mt-2 rounded border border-ok/40 bg-ok/10 p-2">
                      <p className="font-semibold text-ink">
                        {textoValorCotacao(c.valor_centavos)}, {textoPrazoCotacao(c.prazo_min ?? 1, c.prazo_max ?? 1)}
                      </p>
                      {c.valor_carrinho_centavos != null && (
                        <p className="text-ink-2">
                          Levando também {itensCarrinho.map((i) => `${i.quantidade}× ${produto.get(i.produto_id)?.nome ?? "Produto"}`).join(", ")}:{" "}
                          {formatBRL(c.valor_carrinho_centavos / 100)} de frete para tudo.
                        </p>
                      )}
                      {c.valida_ate && <p className="text-[12px] text-muted">Vale até {dataHoraCurta(c.valida_ate)}. No checkout, use o CEP {formatarCep(c.cep_destino)}.</p>}
                      <div className="mt-2 flex flex-wrap gap-2">
                        {carrinho ? (
                          <BotaoComprarComFrete lojaId={c.loja_id} itens={carrinho} />
                        ) : (
                          <p className="text-erro">Produto indisponível ou sem estoque para esta quantidade.</p>
                        )}
                        {carrinhoTudo && (
                          <BotaoComprarComFrete lojaId={c.loja_id} itens={carrinhoTudo} rotulo="Comprar tudo com o vendedor" />
                        )}
                      </div>
                    </div>
                  ) : (
                    mensagem && <p className="mt-2 rounded border border-line bg-surface p-2">{mensagem}</p>
                  )}

                  <div className="mt-2 flex flex-wrap gap-3 text-[13px]">
                    {c.efetivo === "aguardando" && (
                      <form action={cancelarCotacaoFrete.bind(null, c.id)}>
                        <button type="submit" className="text-muted underline underline-offset-2">
                          Cancelar pedido de cotação
                        </button>
                      </form>
                    )}
                    {["recusada", "expirada", "vencida"].includes(c.efetivo) && c.produto_id && (
                      <Link href={`/produto/${c.produto_id}`} className="text-lm-azul underline underline-offset-2">
                        Pedir de novo
                      </Link>
                    )}
                    {c.efetivo === "usada" && c.pedido_id && (
                      <Link href={`/pedido/${c.pedido_id}`} className="text-lm-azul underline underline-offset-2">
                        Ver o pedido {idVenda.get(c.pedido_id) ?? ""}
                      </Link>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </main>
      <VitrineFooter />
    </div>
  );
}
