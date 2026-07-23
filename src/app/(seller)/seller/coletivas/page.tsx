import { getUser, getMinhaLoja } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ErrorState } from "@/components/ErrorState";
import { PageTitle, PrecisaLogin, SemLoja, VazioBox } from "@/components/seller/states";
import { formatBRL } from "@/components/seller/format";
import { cancelarColetiva } from "./actions";

export const dynamic = "force-dynamic";

// Painel do seller: compras coletivas dos produtos da loja (PRD MPDD-36).
// Leitura direta — escrita só via RPC coletiva_cancelar (migration 0070).
export default async function ColetivasSellerPage() {
  const user = await getUser();
  if (!user) return <PrecisaLogin />;

  const loja = await getMinhaLoja();
  if (!loja) return <SemLoja />;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("compras_coletivas")
    .select(
      "id, produto_id, meta_qtd, qtd_atual, valor_unitario, preco_base, prazo, status, created_at, produtos(nome), coletiva_participacoes(id, quantidade, pedido_id)",
    )
    .eq("loja_id", loja.id)
    .order("created_at", { ascending: false });

  if (error) {
    return <ErrorState title="Falha ao carregar coletivas" detail={error.message} />;
  }

  const coletivas = data ?? [];

  return (
    <div>
      <PageTitle
        title="Compras coletivas"
        subtitle="Compradores somam quantidades até a 1ª faixa do seu desconto progressivo. Os pedidos só nascem quando a meta fecha."
      />

      {coletivas.length === 0 ? (
        <VazioBox>
          Nenhuma compra coletiva ainda. Coletivas são criadas pelos compradores
          nas páginas dos seus produtos com desconto progressivo ativo (faixa
          abaixo do preço base).
        </VazioBox>
      ) : (
        <div className="overflow-x-auto rounded border border-line bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-[12px] uppercase tracking-wider text-muted">
                <th className="px-4 py-3">Produto</th>
                <th className="px-4 py-3">Progresso</th>
                <th className="px-4 py-3">Preço travado</th>
                <th className="px-4 py-3">Prazo</th>
                <th className="px-4 py-3">Participantes</th>
                <th className="px-4 py-3">Pedidos pagáveis</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {coletivas.map((c) => {
                const participacoes = c.coletiva_participacoes ?? [];
                const pedidos = participacoes.filter((p) => p.pedido_id).length;
                const expirada = c.status === "Aberta" && new Date(c.prazo) < new Date();
                const status = expirada ? "Expirada" : c.status;
                return (
                  <tr key={c.id} className="border-b border-line last:border-0">
                    <td className="px-4 py-3 font-medium text-ink">
                      {c.produtos?.nome ?? "—"}
                    </td>
                    <td className="num px-4 py-3">
                      {c.qtd_atual}/{c.meta_qtd} un
                    </td>
                    <td className="num px-4 py-3">
                      {formatBRL(c.valor_unitario)}{" "}
                      <span className="text-muted line-through">{formatBRL(c.preco_base)}</span>
                    </td>
                    <td className="num px-4 py-3">
                      {new Date(c.prazo).toLocaleDateString("pt-BR")}
                    </td>
                    <td className="num px-4 py-3">{participacoes.length}</td>
                    <td className="num px-4 py-3">{pedidos}</td>
                    <td className="px-4 py-3">
                      <span
                        className={
                          status === "Atingida"
                            ? "text-verde-24h"
                            : status === "Aberta"
                              ? "text-ink"
                              : "text-muted"
                        }
                      >
                        {status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {status === "Aberta" && (
                        <form action={cancelarColetiva}>
                          <input type="hidden" name="coletiva_id" value={c.id} />
                          <button
                            type="submit"
                            className="rounded border border-line px-3 py-1 text-xs text-ink hover:border-red-400 hover:text-red-600"
                          >
                            Cancelar
                          </button>
                        </form>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
