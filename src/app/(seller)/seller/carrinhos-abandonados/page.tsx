import { getUser, getMinhaLoja } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ErrorState } from "@/components/ErrorState";
import { PageTitle, PrecisaLogin, SemLoja, VazioBox } from "@/components/seller/states";
import { formatData } from "@/components/seller/format";
import { Table, StatusBadge } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

type ItemLoja = { produto_id: string; nome: string; quantidade: number };

type CarrinhoAbandonado = {
  user_id: string;
  email: string;
  itens: ItemLoja[] | null;
  atualizado_em: string;
  lembrete_enviado_em: string | null;
  convertido: boolean;
};

// Painel do seller: carrinhos abandonados que contêm itens da própria loja
// (o carrinho pode ter itens de várias lojas, ver carrinho.tsx). Filtro e
// itens já vêm restritos pela RPC seller_carrinhos_abandonados (migration
// 0098) — a policy de RLS de carrinhos_abandonados só libera o dono
// (comprador), então a leitura pelo seller precisa passar por essa função
// SECURITY DEFINER em vez de select direto na tabela.
export default async function CarrinhosAbandonadosPage() {
  const user = await getUser();
  if (!user) return <PrecisaLogin />;

  const loja = await getMinhaLoja();
  if (!loja) return <SemLoja />;

  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- RPC fora dos tipos gerados
  const { data, error } = await (supabase as any).rpc("seller_carrinhos_abandonados");
  if (error) {
    return <ErrorState title="Falha ao carregar carrinhos abandonados" detail={error.message} />;
  }

  const carrinhos = (data ?? []) as CarrinhoAbandonado[];

  return (
    <div>
      <PageTitle
        title="Carrinhos abandonados"
        subtitle="Compradores com itens da sua loja parados no carrinho há mais de 1h."
      />
      {carrinhos.length === 0 ? (
        <VazioBox>Nenhum carrinho abandonado com itens da sua loja no momento.</VazioBox>
      ) : (
        <Table headers={["Comprador", "Itens", "Abandonado em", "Lembrete", "Status"]}>
          {carrinhos.map((c) => (
            <tr key={c.user_id}>
              <td className="px-4 py-3 text-sm">{c.email}</td>
              <td className="px-4 py-3 text-sm">
                {(c.itens ?? []).map((i) => `${i.quantidade}x ${i.nome}`).join(", ")}
              </td>
              <td className="px-4 py-3 text-sm text-muted">{formatData(c.atualizado_em)}</td>
              <td className="px-4 py-3 text-sm text-muted">
                {c.lembrete_enviado_em ? formatData(c.lembrete_enviado_em) : "—"}
              </td>
              <td className="px-4 py-3">
                <StatusBadge status={c.convertido ? "Convertido" : "Aguardando"} />
              </td>
            </tr>
          ))}
        </Table>
      )}
    </div>
  );
}
