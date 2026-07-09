import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth";
import { ErrorState } from "@/components/ErrorState";
import { formatBRL } from "@/components/seller/format";
import { PrecisaLogin } from "@/components/seller/states";
import {
  PageHeader,
  Table,
  StatusBadge,
  EmptyState,
} from "@/components/admin/ui";
import { fetchAll } from "@/lib/supabase/fetch-all";

export default async function AfiliadoPage() {
  const user = await getUser();
  if (!user) return <PrecisaLogin />;

  const supabase = await createClient();

  const { data: afiliacoes, error: errAfiliacoes } = await supabase
    .from("afiliacoes")
    .select("id, loja_id, produto_id, identificador, porcentagem, status")
    .order("id", { ascending: false });

  if (errAfiliacoes) {
    return (
      <ErrorState
        title="Erro ao carregar afiliações"
        detail={errAfiliacoes.message}
      />
    );
  }

  // View sem endereço de entrega do comprador (migration 0013).
  const { data: itens, error: errItens } = await fetchAll((from, to) =>
    supabase
      .from("afiliado_ganhos")
      .select("id, produto_nome, quantidade, valor, repasse_afiliado, pago")
      .order("id", { ascending: false })
      .range(from, to),
  );

  if (errItens) {
    return (
      <ErrorState title="Erro ao carregar vendas" detail={errItens.message} />
    );
  }

  const lojaIds = Array.from(
    new Set((afiliacoes ?? []).map((a) => a.loja_id).filter((v): v is string => v !== null))
  );
  const produtoIds = Array.from(
    new Set((afiliacoes ?? []).map((a) => a.produto_id).filter((v): v is string => v !== null))
  );

  const lojasMap = new Map<string, string>();
  if (lojaIds.length > 0) {
    const { data: lojas } = await supabase
      .from("lojas_vitrine") // view pública sem PII (0012)
      .select("id, nome")
      .in("id", lojaIds);
    (lojas ?? []).forEach((l) => lojasMap.set(l.id, l.nome));
  }

  const produtosMap = new Map<string, string>();
  if (produtoIds.length > 0) {
    const { data: produtos } = await supabase
      .from("produtos")
      .select("id, nome")
      .in("id", produtoIds);
    (produtos ?? []).forEach((p) => produtosMap.set(p.id, p.nome));
  }

  function idCurto(id: string) {
    return id ? id.slice(0, 8) : "—";
  }

  const totalAfiliacoes = afiliacoes?.length ?? 0;
  const aprovadas = (afiliacoes ?? []).filter(
    (a) => a.status === "Aprovada"
  ).length;
  const ganhosTotais = (itens ?? []).reduce(
    (acc, i) => acc + (i.repasse_afiliado ?? 0),
    0
  );

  return (
    <div className="space-y-8">
      <PageHeader
        title="Meu painel de afiliado"
        subtitle="Acompanhe suas afiliações e vendas com seu código"
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-sm border border-borda bg-white p-4">
          <p className="text-xs uppercase tracking-[.12em] text-muted">
            Total de afiliações
          </p>
          <p className="text-2xl font-bold mt-1">{totalAfiliacoes}</p>
        </div>
        <div className="rounded-sm border border-borda bg-white p-4">
          <p className="text-xs uppercase tracking-[.12em] text-muted">
            Afiliações aprovadas
          </p>
          <p className="text-2xl font-bold mt-1">{aprovadas}</p>
        </div>
        <div className="rounded-sm border border-borda bg-white p-4">
          <p className="text-xs uppercase tracking-[.12em] text-muted">
            Ganhos totais
          </p>
          <p className="text-2xl font-semibold num mt-1">
            {formatBRL(ganhosTotais)}
          </p>
        </div>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-bold">Minhas afiliações</h2>
        {totalAfiliacoes === 0 ? (
          <EmptyState>Você ainda não possui afiliações cadastradas.</EmptyState>
        ) : (
          <Table headers={["Código", "Loja", "Produto", "Porcentagem", "Status"]}>
            {(afiliacoes ?? []).map((a) => (
              <tr key={a.id}>
                <td className="py-[9px] px-3">{a.identificador}</td>
                <td className="py-[9px] px-3">
                  {(a.loja_id && lojasMap.get(a.loja_id)) ?? `Loja ${idCurto(a.loja_id ?? "")}`}
                </td>
                <td className="py-[9px] px-3">
                  {(a.produto_id && produtosMap.get(a.produto_id)) ??
                    `Produto ${idCurto(a.produto_id ?? "")}`}
                </td>
                <td className="py-[9px] px-3 text-right num font-semibold">
                  {a.porcentagem}%
                </td>
                <td className="py-[9px] px-3">
                  <StatusBadge status={a.status} />
                </td>
              </tr>
            ))}
          </Table>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold">Vendas com meu código</h2>
        {(itens ?? []).length === 0 ? (
          <EmptyState>
            Nenhuma venda registrada com seu código de afiliado ainda.
          </EmptyState>
        ) : (
          <Table headers={["Produto", "Quantidade", "Valor", "Repasse", "Pago"]}>
            {(itens ?? []).map((i) => (
              <tr key={i.id}>
                <td className="py-[9px] px-3">{i.produto_nome}</td>
                <td className="py-[9px] px-3 text-right num">{i.quantidade}</td>
                <td className="py-[9px] px-3 text-right num font-semibold">
                  {formatBRL(i.valor)}
                </td>
                <td className="py-[9px] px-3 text-right num font-semibold">
                  {formatBRL(i.repasse_afiliado ?? 0)}
                </td>
                <td className="py-[9px] px-3">
                  <StatusBadge status={i.pago ? "Pago" : "Pendente"} />
                </td>
              </tr>
            ))}
          </Table>
        )}
      </section>
    </div>
  );
}
