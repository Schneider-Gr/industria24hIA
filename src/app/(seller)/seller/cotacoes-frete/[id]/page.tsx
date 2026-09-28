import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMinhaLoja } from "@/lib/auth";
import { PageTitle, SemLoja } from "@/components/seller/states";
import { formatBRL } from "@/components/seller/format";
import { formatarCep } from "@/lib/cep";
import {
  dataHoraCurta,
  statusEfetivo,
  textoPrazoCotacao,
  textoValorCotacao,
} from "@/lib/catalogo-compra/cotacao-frete";
import { FormRespostaCotacao } from "./FormRespostaCotacao";

export const dynamic = "force-dynamic";

export default async function CotacaoFreteDetalhe({ params }: { params: Promise<{ id: string }> }) {
  const loja = await getMinhaLoja();
  if (!loja) return <SemLoja />;
  const { id } = await params;

  const supabase = await createClient();
  const { data: c } = await supabase
    .from("cotacoes_frete_vendedor")
    .select("*")
    .eq("id", id)
    .eq("loja_id", loja.id)
    .maybeSingle();
  if (!c) notFound();

  const itens = (c.itens as { produto_id: string; quantidade: number }[]) ?? [];
  const itensCarrinho = (c.itens_carrinho as { produto_id: string; quantidade: number }[] | null) ?? [];
  const ids = [...new Set([...itens, ...itensCarrinho].map((i) => i.produto_id))];
  const { data: produtos } = await supabase.from("produtos").select("id, nome, valor").in("id", ids);
  const porId = new Map((produtos ?? []).map((p) => [p.id, p]));
  const valorProdutos = itens.reduce((s, i) => s + Number(porId.get(i.produto_id)?.valor ?? 0) * i.quantidade, 0);
  const efetivo = statusEfetivo(c);

  return (
    <div className="max-w-2xl">
      <Link href="/seller/cotacoes-frete" className="text-sm text-lm-azul underline underline-offset-2">
        ← Cotações de frete
      </Link>
      <PageTitle title="Pedido de cotação de frete" />

      <section className="space-y-2 rounded border border-line bg-white p-4 text-sm">
        <ul>
          {itens.map((i) => (
            <li key={i.produto_id} className="font-semibold text-ink">
              {porId.get(i.produto_id)?.nome ?? "Produto"}: {i.quantidade} un.
            </li>
          ))}
        </ul>
        <p className="text-muted">Valor dos produtos (preço cheio): {formatBRL(valorProdutos)}</p>
        <p>
          Entrega: {[c.bairro_destino, c.cidade_destino, c.uf_destino].filter(Boolean).join(", ")} (CEP{" "}
          {formatarCep(c.cep_destino)})
        </p>
        {c.cep_origem && <p className="text-muted">Sai do CEP {formatarCep(c.cep_origem)}.</p>}
        {c.observacao && <p>Observação do cliente: &ldquo;{c.observacao}&rdquo;</p>}
        {itensCarrinho.length > 0 && (
          <p className="text-muted">
            O cliente também leva, com frete normal:{" "}
            {itensCarrinho.map((i) => `${porId.get(i.produto_id)?.nome ?? "Produto"} (${i.quantidade} un.)`).join(", ")}.
            Se quiser mandar tudo junto, informe também o valor do carrinho inteiro.
          </p>
        )}
      </section>

      <section className="mt-4 rounded border border-line bg-white p-4 text-sm">
        {efetivo === "aguardando" ? (
          <>
            <p className="mb-3 text-ink">
              Responda até <strong>{dataHoraCurta(c.responder_ate)}</strong>. Quem responde rápido vende mais. O valor
              vale por 48 horas para este CEP e esta quantidade.
            </p>
            <FormRespostaCotacao id={c.id} temCarrinho={itensCarrinho.length > 0} />
          </>
        ) : efetivo === "respondida" || efetivo === "usada" || efetivo === "vencida" ? (
          <p>
            Você respondeu {c.valor_centavos != null ? textoValorCotacao(c.valor_centavos).toLowerCase() : ""}
            {c.prazo_min && c.prazo_max ? `, ${textoPrazoCotacao(c.prazo_min, c.prazo_max)}` : ""}.
            {c.valor_carrinho_centavos != null && ` Carrinho inteiro: ${formatBRL(c.valor_carrinho_centavos / 100)}.`}
            {efetivo === "usada" && " O cliente comprou com este frete."}
            {efetivo === "vencida" && " A resposta venceu sem compra."}
          </p>
        ) : efetivo === "recusada" ? (
          <p>Você respondeu que não entrega nesse CEP.</p>
        ) : (
          <p>A cotação expirou sem resposta. O cliente foi avisado e pode pedir de novo.</p>
        )}
      </section>
    </div>
  );
}
