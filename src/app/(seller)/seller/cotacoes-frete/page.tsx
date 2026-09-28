import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getMinhaLoja } from "@/lib/auth";
import { PageTitle, SemLoja } from "@/components/seller/states";
import { EmptyState } from "@/components/painel/ui";
import { formatarCep } from "@/lib/cep";
import { dataHoraCurta, statusEfetivo, textoValorCotacao } from "@/lib/catalogo-compra/cotacao-frete";

export const dynamic = "force-dynamic";

const ROTULO: Record<string, string> = {
  aguardando: "Aguardando sua resposta",
  respondida: "Respondida",
  recusada: "Recusada",
  expirada: "Expirada",
  vencida: "Resposta vencida",
  usada: "Virou pedido",
};

// Pedidos de cotação de frete a combinar (PRD 050, 0203). O comprador não
// aparece: só produto, quantidade, destino e observação.
export default async function CotacoesFretePage() {
  const loja = await getMinhaLoja();
  if (!loja) return <SemLoja />;

  const supabase = await createClient();
  const { data: cotacoes } = await supabase
    .from("cotacoes_frete_vendedor")
    .select("id, status, itens, cep_destino, bairro_destino, cidade_destino, uf_destino, responder_ate, valida_ate, valor_centavos, criado_em")
    .eq("loja_id", loja.id)
    .not("status", "in", "(substituida,cancelada)")
    .order("criado_em", { ascending: false })
    .limit(100);

  const itens = (cotacoes ?? []).flatMap((c) => (c.itens as { produto_id: string }[]) ?? []);
  const { data: produtos } = itens.length
    ? await supabase.from("produtos").select("id, nome").in("id", [...new Set(itens.map((i) => i.produto_id))])
    : { data: [] as { id: string; nome: string }[] };
  const nomes = new Map((produtos ?? []).map((p) => [p.id, p.nome]));

  const lista = (cotacoes ?? []).map((c) => ({ ...c, efetivo: statusEfetivo(c) }));
  const pendentes = lista.filter((c) => c.efetivo === "aguardando").length;

  return (
    <div>
      <PageTitle
        title="Cotações de frete"
        subtitle="Produtos com frete a combinar: o cliente pede o frete e você responde valor e prazo em até 24 horas."
        count={pendentes}
      />
      {!loja.entrega_a_combinar && (
        <p className="mb-4 rounded border border-warn/40 bg-warn/10 p-3 text-sm">
          A entrega a combinar ainda não está ligada para a sua loja. Fale com a Indústria 24h para ativar.
        </p>
      )}
      {lista.length === 0 ? (
        <EmptyState>Nenhum pedido de cotação ainda.</EmptyState>
      ) : (
        <ul className="space-y-2">
          {lista.map((c) => (
            <li key={c.id}>
              <Link
                href={`/seller/cotacoes-frete/${c.id}`}
                className={`block rounded border bg-white p-3 text-sm hover:border-lm-azul ${c.efetivo === "aguardando" ? "border-lm-azul" : "border-line"}`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold text-ink">
                    {((c.itens as { produto_id: string; quantidade: number }[]) ?? [])
                      .map((i) => `${nomes.get(i.produto_id) ?? "Produto"} (${i.quantidade} un.)`)
                      .join(", ")}
                  </span>
                  <span className={c.efetivo === "aguardando" ? "font-semibold text-lm-azul" : "text-muted"}>
                    {ROTULO[c.efetivo] ?? c.efetivo}
                  </span>
                </div>
                <p className="mt-1 text-muted">
                  {[c.bairro_destino, c.cidade_destino, c.uf_destino].filter(Boolean).join(", ")} (CEP {formatarCep(c.cep_destino)})
                  {c.efetivo === "aguardando" && ` · responder até ${dataHoraCurta(c.responder_ate)}`}
                  {c.efetivo === "respondida" && c.valor_centavos != null && ` · ${textoValorCotacao(c.valor_centavos)}`}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
