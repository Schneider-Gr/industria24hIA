import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth";
import { ErrorState } from "@/components/ErrorState";
import { PrecisaLogin, PageTitle } from "@/components/seller/states";
import { Table, StatusBadge, EmptyState } from "@/components/admin/ui";
import { solicitarAfiliacao } from "../actions";

export default async function SolicitarAfiliacaoPage() {
  const user = await getUser();
  if (!user) return <PrecisaLogin />;

  const supabase = await createClient();

  const { data: produtos, error } = await supabase
    .from("produtos")
    .select("id, nome, valor, loja_id, porcentagem_afiliado")
    .eq("permite_afiliacao", true)
    .order("nome", { ascending: true });

  if (error) {
    return (
      <ErrorState
        title="Erro ao carregar produtos"
        detail={error.message}
      />
    );
  }

  if (!produtos || produtos.length === 0) {
    return (
      <div className="p-6">
        <PageTitle
          title="Solicitar afiliação"
          subtitle="Produtos disponíveis para afiliação"
        />
        <EmptyState>Nenhum produto disponível para afiliação no momento.</EmptyState>
      </div>
    );
  }

  const lojaIds = Array.from(new Set(produtos.map((p) => p.loja_id)));
  const produtoIds = produtos.map((p) => p.id);

  const { data: lojas, error: errLojas } = await supabase
    .from("lojas_vitrine") // view pública sem PII (0012)
    .select("id, nome")
    .in("id", lojaIds);

  if (errLojas) {
    return (
      <ErrorState
        title="Erro ao carregar lojas"
        detail={errLojas.message}
      />
    );
  }

  const lojaMap = new Map((lojas ?? []).map((l) => [l.id, l.nome]));

  const { data: afiliacoes, error: errAfiliacoes } = await supabase
    .from("afiliacoes")
    .select("produto_id, status")
    .eq("afiliado_id", user.id)
    .in("produto_id", produtoIds);

  if (errAfiliacoes) {
    return (
      <ErrorState
        title="Erro ao carregar afiliações"
        detail={errAfiliacoes.message}
      />
    );
  }

  const afiliacaoMap = new Map(
    (afiliacoes ?? []).map((a) => [a.produto_id, a.status])
  );

  return (
    <div className="p-6">
      <PageTitle
        title="Solicitar afiliação"
        subtitle="Produtos disponíveis para afiliação"
      />

      <Table headers={["Produto", "Loja", "Comissão", "Ação"]}>
        {produtos.map((p) => {
          const status = afiliacaoMap.get(p.id);
          return (
            <tr key={p.id}>
              <td className="px-4 py-[9px]">{p.nome}</td>
              <td className="px-4 py-[9px]">
                {lojaMap.get(p.loja_id) ?? "—"}
              </td>
              <td className="px-4 py-[9px] text-right">
                <span className="num">{p.porcentagem_afiliado}%</span>
              </td>
              <td className="px-4 py-[9px] text-right">
                {status ? (
                  <StatusBadge status={status} />
                ) : (
                  <form action={solicitarAfiliacao}>
                    <input type="hidden" name="produto_id" value={p.id} />
                    <input type="hidden" name="loja_id" value={p.loja_id} />
                    <button
                      type="submit"
                      className="bg-laranja text-white hover:bg-laranja-escuro rounded font-semibold px-3 py-1.5 text-sm"
                    >
                      Solicitar
                    </button>
                  </form>
                )}
              </td>
            </tr>
          );
        })}
      </Table>
    </div>
  );
}
