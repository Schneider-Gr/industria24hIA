import { getUser, getMinhaLoja } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ErrorState } from "@/components/ErrorState";
import { PageTitle, PrecisaLogin, SemLoja, VazioBox } from "@/components/seller/states";
import { criarPromocao, alternarPromocao } from "./actions";

export const dynamic = "force-dynamic";

export default async function PromocoesPage() {
  const user = await getUser();
  if (!user) return <PrecisaLogin />;

  const loja = await getMinhaLoja();
  if (!loja) return <SemLoja />;

  const supabase = await createClient();
  const { data: produtos } = await supabase
    .from("produtos")
    .select("id, nome")
    .eq("loja_id", loja.id);

  const nomePorProduto = new Map((produtos ?? []).map((p) => [p.id, p.nome]));
  const ids = [...nomePorProduto.keys()];

  const { data, error } = ids.length
    ? await supabase
        .from("promocoes_progressivas")
        .select("id, produto_id, faixas, ativo")
        .in("produto_id", ids)
    : { data: [], error: null };

  if (error) {
    return <ErrorState title="Falha ao carregar promoções" detail={error.message} />;
  }

  const promocoes = data ?? [];

  return (
    <div>
      <PageTitle
        title="Promoções"
        subtitle="Descontos progressivos por faixa de quantidade, por produto."
      />

      <div className="mb-8 rounded border border-line bg-white p-4">
        <h2 className="mb-3 text-[15px] font-semibold text-ink">Nova promoção</h2>
        {(produtos ?? []).length === 0 ? (
          <p className="text-sm text-muted">
            Cadastre um produto antes de criar uma promoção.
          </p>
        ) : (
          <form action={criarPromocao} className="grid gap-3 sm:grid-cols-4 sm:items-end">
            <div className="sm:col-span-2">
              <label htmlFor="produto_id" className="mb-1 block text-[12px] font-medium text-muted uppercase tracking-wider">
                Produto
              </label>
              <select
                id="produto_id"
                name="produto_id"
                required
                className="w-full rounded border border-line px-3 py-2 text-sm text-ink"
              >
                {(produtos ?? []).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nome}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="min_qtd" className="mb-1 block text-[12px] font-medium text-muted uppercase tracking-wider">
                A partir de
              </label>
              <input
                id="min_qtd"
                name="min_qtd"
                type="number"
                min={1}
                step={1}
                required
                placeholder="Quantidade produto"
                className="w-full rounded border border-line px-3 py-2 text-sm text-ink num"
              />
            </div>

            <div>
              <label htmlFor="valor_unitario" className="mb-1 block text-[12px] font-medium text-muted uppercase tracking-wider">
                O produto fica por
              </label>
              <input
                id="valor_unitario"
                name="valor_unitario"
                type="number"
                min={0}
                step={0.01}
                required
                placeholder="Valor do produto unitario"
                className="w-full rounded border border-line px-3 py-2 text-sm text-ink num"
              />
            </div>

            <div>
              <label htmlFor="validade" className="mb-1 block text-[12px] font-medium text-muted uppercase tracking-wider">
                Validade
              </label>
              <input
                id="validade"
                name="validade"
                type="date"
                className="w-full rounded border border-line px-3 py-2 text-sm text-ink"
              />
            </div>

            <div className="sm:col-span-4">
              <button
                type="submit"
                className="rounded bg-sinal px-4 py-2 text-sm font-semibold text-white hover:bg-sinal-escuro"
              >
                Criar promoção
              </button>
            </div>
          </form>
        )}
      </div>

      {promocoes.length === 0 ? (
        <VazioBox>Nenhuma promoção progressiva cadastrada.</VazioBox>
      ) : (
        <div className="overflow-x-auto rounded border-line border">
          <table className="w-full text-sm">
            <thead className="bg-surface">
              <tr>
                <th className="px-4 py-2 uppercase text-[11px] tracking-wider text-muted font-medium">Produto</th>
                <th className="px-4 py-2 uppercase text-[11px] tracking-wider text-muted font-medium">Descontos aplicados</th>
                <th className="px-4 py-2 uppercase text-[11px] tracking-wider text-muted font-medium">Ativo</th>
                <th className="px-4 py-2 uppercase text-[11px] tracking-wider text-muted font-medium">Ação</th>
              </tr>
            </thead>
            <tbody>
              {promocoes.map((p) => {
                const faixas = Array.isArray(p.faixas)
                  ? (p.faixas as { min_qtd: number; valor_unitario: number; validade?: string | null }[])
                  : [];
                return (
                  <tr key={p.id} className="border-t border-line">
                    <td className="px-4 py-2 text-ink">{nomePorProduto.get(p.produto_id) ?? "—"}</td>
                    <td className="px-4 py-2 text-ink">
                      {faixas.length === 0
                        ? "—"
                        : faixas
                            .map((f) => `A partir de ${f.min_qtd}: R$ ${f.valor_unitario.toFixed(2)}`)
                            .join(" · ")}
                    </td>
                    <td className="px-4 py-2 text-ink">{p.ativo ? "Sim" : "Não"}</td>
                    <td className="px-4 py-2">
                      <form action={alternarPromocao}><input type="hidden" name="id" value={p.id} /><input type="hidden" name="ativo" value={String(p.ativo)} />
                        <button
                          type="submit"
                          className="rounded border border-line px-3 py-1 text-[13px] font-semibold text-ink hover:bg-surface"
                        >
                          {p.ativo ? "Desativar" : "Ativar"}
                        </button>
                      </form>
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
