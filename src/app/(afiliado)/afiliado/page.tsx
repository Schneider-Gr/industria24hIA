import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth";
import { ErrorState } from "@/components/ErrorState";
import { formatBRL } from "@/components/seller/format";
import { PrecisaLogin } from "@/components/seller/states";
import {
  Table,
  StatusBadge,
  EmptyState,
} from "@/components/admin/ui";
import { fetchAll } from "@/lib/supabase/fetch-all";
import { LinkDivulgacao } from "@/components/afiliado/LinkDivulgacao";

// Domínio público usado para montar o link de divulgação.
const ORIGEM = "https://industria24.com.br";

export default async function AfiliadoPage() {
  const user = await getUser();
  if (!user) return <PrecisaLogin />;

  const supabase = await createClient();

  // Filtro explícito por dono, além da RLS: sem ele, um usuário que também é
  // dono de loja recebe as afiliações da PRÓPRIA LOJA junto com as suas
  // (policy afiliacoes_loja_owner_all dá SELECT ao lojista).
  const { data: afiliacoes, error: errAfiliacoes } = await supabase
    .from("afiliacoes")
    .select("id, loja_id, produto_id, identificador, porcentagem, status, tipo")
    .eq("afiliado_id", user.id)
    .order("id", { ascending: false })
    .limit(200);

  if (errAfiliacoes) {
    return (
      <ErrorState
        title="Erro ao carregar afiliações"
        detail={errAfiliacoes.message}
      />
    );
  }

  // View sem endereço de entrega do comprador (migration 0013). A view já
  // filtra por `afiliado_id = auth.uid()` na própria definição; o filtro aqui
  // é defesa em profundidade e deixa a intenção explícita no código.
  const { data: itens, error: errItens } = await fetchAll((from, to) =>
    supabase
      .from("afiliado_ganhos")
      .select("id, pedido_id, id_venda, pedido_data, produto_nome, quantidade, valor, repasse_afiliado, pago")
      .eq("afiliado_id", user.id)
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
  const pendentes = (afiliacoes ?? []).filter((a) => a.status !== "Aprovada").length;
  // A receber x já recebido: `pago` é a única marcação de repasse na view.
  const aReceber = (itens ?? [])
    .filter((i) => !i.pago)
    .reduce((acc, i) => acc + (i.repasse_afiliado ?? 0), 0);
  const jaRecebido = (itens ?? [])
    .filter((i) => i.pago)
    .reduce((acc, i) => acc + (i.repasse_afiliado ?? 0), 0);
  const vendas = (itens ?? []).length;

  const linksAfiliacao = (afiliacoes ?? []).map((a) => ({
    id: a.id,
    identificador: a.identificador,
    produto_id: a.produto_id,
    produto_nome:
      (a.produto_id && produtosMap.get(a.produto_id)) ?? "Produto da loja",
    aprovada: a.status === "Aprovada",
  }));

  return (
    <div className="space-y-6">
      <LinkDivulgacao afiliacoes={linksAfiliacao} origem={ORIGEM} />

      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        <Kpi rotulo="A receber" valor={formatBRL(aReceber)} cor="text-sinal" />
        <Kpi rotulo="Já recebido" valor={formatBRL(jaRecebido)} cor="text-verde-24h" />
        <Kpi rotulo="Vendas com meu código" valor={String(vendas)} />
        <Kpi
          rotulo="Afiliações"
          valor={String(totalAfiliacoes)}
          tag={pendentes > 0 ? `${pendentes} pendente${pendentes > 1 ? "s" : ""}` : undefined}
        />
      </div>

      <section className="space-y-3">
        <h2 className="text-[13px] font-medium uppercase tracking-[0.08em] text-ink">Minhas afiliações</h2>
        {totalAfiliacoes === 0 ? (
          <EmptyState>Você ainda não possui afiliações cadastradas.</EmptyState>
        ) : (
          <Table
            headers={["Código", "Loja", "Produto", "Porcentagem", "Tipo", "Status"]}
          >
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
                  {a.tipo === "logistica" ? "Logística" : "Vendas"}
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
        <h2 className="text-[13px] font-medium uppercase tracking-[0.08em] text-ink">Vendas com meu código</h2>
        {(itens ?? []).length === 0 ? (
          <EmptyState>
            Nenhuma venda registrada com seu código de afiliado ainda.
          </EmptyState>
        ) : (
          <Table headers={["Data", "Pedido", "Produto", "Qtd.", "Valor", "Repasse", "Pago"]}>
            {(itens ?? []).map((i) => (
              <tr key={i.id}>
                <td className="num py-[9px] px-3 text-ink-2">
                  {i.pedido_data
                    ? new Date(i.pedido_data).toLocaleDateString("pt-BR")
                    : "—"}
                </td>
                <td className="num py-[9px] px-3 text-aco-600">{i.id_venda ?? "—"}</td>
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

// Card de indicador no padrão do mockup: rótulo caixa-alta 11px, número 21px
// tabular, tag opcional.
function Kpi({
  rotulo,
  valor,
  cor = "text-ink",
  tag,
}: {
  rotulo: string;
  valor: string;
  cor?: string;
  tag?: string;
}) {
  return (
    <div className="rounded-md border border-line bg-surface p-3">
      <p className="text-[11px] uppercase tracking-[0.08em] text-muted">{rotulo}</p>
      <p className={`num mt-1.5 text-[21px] font-medium ${cor}`}>
        {valor}
        {tag && (
          <span className="ml-2 align-[3px] rounded-sm bg-yellow-100 px-1.5 py-0.5 text-[11px] font-medium text-yellow-800">
            {tag}
          </span>
        )}
      </p>
    </div>
  );
}
