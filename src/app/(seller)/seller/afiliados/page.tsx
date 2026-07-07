import { getUser, getMinhaLoja } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ErrorState } from "@/components/ErrorState";
import { KpiCard } from "@/components/seller/KpiCard";
import { PageTitle, PrecisaLogin, SemLoja, VazioBox } from "@/components/seller/states";
import { moderarAfiliacao } from "./actions";

export const dynamic = "force-dynamic";

export default async function AfiliadosPage() {
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

  const query = supabase
    .from("afiliacoes")
    .select("id, loja_id, produto_id, identificador, porcentagem, status");

  const { data, error } = ids.length
    ? await query.or(`produto_id.in.(${ids.join(",")}),loja_id.eq.${loja.id}`)
    : await query.eq("loja_id", loja.id);

  if (error) {
    return <ErrorState title="Falha ao carregar afiliações" detail={error.message} />;
  }

  // dedup por id (afiliação pode casar por produto_id e loja_id ao mesmo tempo)
  const mapaAfiliacoes = new Map((data ?? []).map((a) => [a.id, a]));
  const afiliacoes = [...mapaAfiliacoes.values()];
  const pendentes = afiliacoes.filter((a) => a.status === "Pendente").length;

  return (
    <div>
      <PageTitle
        title="Afiliados produtos"
        subtitle="Afiliados/representantes vinculados aos seus produtos."
      />

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <KpiCard label="Afiliações" value={afiliacoes.length} />
        <KpiCard label="Pendentes" value={pendentes} accent={pendentes > 0 ? "warning" : "default"} />
      </div>

      {afiliacoes.length === 0 ? (
        <VazioBox>Nenhuma afiliação registrada.</VazioBox>
      ) : (
        <div className="overflow-x-auto rounded border-line">
          <table className="w-full text-sm">
            <thead className="bg-surface">
              <tr>
                <th className="px-4 py-2 uppercase text-[11px] tracking-wider text-muted font-medium">Afiliado</th>
                <th className="px-4 py-2 uppercase text-[11px] tracking-wider text-muted font-medium">Produto</th>
                <th className="px-4 py-2 uppercase text-[11px] tracking-wider text-muted font-medium text-right">%</th>
                <th className="px-4 py-2 uppercase text-[11px] tracking-wider text-muted font-medium">Status</th>
                <th className="px-4 py-2 uppercase text-[11px] tracking-wider text-muted font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {afiliacoes.map((a) => (
                <tr key={a.id} className="border-t border-line">
                  <td className="px-4 py-2">{a.identificador ?? "—"}</td>
                  <td className="px-4 py-2">{(a.produto_id && nomePorProduto.get(a.produto_id)) ?? "—"}</td>
                  <td className="px-4 py-2 text-right num font-semibold">{a.porcentagem}%</td>
                  <td className="px-4 py-2">{a.status}</td>
                  <td className="px-4 py-2">
                    <div className="flex gap-2">
                      {a.status !== "Aprovada" && (
                        <form action={moderarAfiliacao}>
                          <input type="hidden" name="id" value={a.id} />
                          <input type="hidden" name="status" value="Aprovada" />
                          <button
                            type="submit"
                            className="rounded bg-laranja px-3 py-1 text-xs font-semibold text-white hover:bg-laranja-escuro"
                          >
                            Aprovar
                          </button>
                        </form>
                      )}
                      {a.status !== "Suspensa" && (
                        <form action={moderarAfiliacao}>
                          <input type="hidden" name="id" value={a.id} />
                          <input type="hidden" name="status" value="Suspensa" />
                          <button
                            type="submit"
                            className="rounded border border-line px-3 py-1 text-xs font-semibold text-ink hover:bg-surface"
                          >
                            Suspender
                          </button>
                        </form>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
