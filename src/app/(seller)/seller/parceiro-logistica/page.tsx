import { getUser, getMinhaLoja } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ErrorState } from "@/components/ErrorState";
import { PageTitle, PrecisaLogin, SemLoja, VazioBox } from "@/components/seller/states";
import { formatData } from "@/components/seller/format";
import { decidirParceria } from "./actions";

export const dynamic = "force-dynamic";

// Seção "Parceiro logística" do Bubble (/version-test/seller): pedidos de
// parceria com representantes + lista de parceiros vinculados à loja
// (colunas observadas: Representante, Produto, Porcentagem, Status, Ações).
// Schema desenhado do zero em 0049 (Bubble tinha 0 linhas de dado — nada a
// copiar). Distinto de public.afiliacoes: aqui é o pedido de parceria antes
// de virar afiliação ativa.
export default async function ParceiroLogisticaPage() {
  const user = await getUser();
  if (!user) return <PrecisaLogin />;

  const loja = await getMinhaLoja();
  if (!loja) return <SemLoja />;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("parcerias_representante")
    .select("id, porcentagem, status, criado_em, produtos(nome)")
    .eq("loja_id", loja.id)
    .order("criado_em", { ascending: false });

  if (error) {
    return <ErrorState title="Falha ao carregar parcerias" detail={error.message} />;
  }

  const parcerias = data ?? [];

  return (
    <div>
      <PageTitle
        title="Parceiro logística"
        subtitle="Pedidos de parceria e representantes vinculados à sua loja."
      />

      {parcerias.length === 0 ? (
        <VazioBox>Nenhum pedido de parceria recebido ainda.</VazioBox>
      ) : (
        <div className="overflow-x-auto rounded border border-line">
          <table className="w-full text-sm">
            <thead className="bg-surface">
              <tr>
                <th className="px-4 py-2 uppercase text-[11px] tracking-wider text-muted font-semibold">Produto</th>
                <th className="px-4 py-2 uppercase text-[11px] tracking-wider text-muted font-semibold">Porcentagem</th>
                <th className="px-4 py-2 uppercase text-[11px] tracking-wider text-muted font-semibold">Data</th>
                <th className="px-4 py-2 uppercase text-[11px] tracking-wider text-muted font-semibold">Status</th>
                <th className="px-4 py-2 uppercase text-[11px] tracking-wider text-muted font-semibold">Ações</th>
              </tr>
            </thead>
            <tbody>
              {parcerias.map((p) => (
                <tr key={p.id} className="border-t border-line">
                  <td className="px-4 py-2 text-ink">{p.produtos?.nome ?? "—"}</td>
                  <td className="px-4 py-2 text-ink">{p.porcentagem}%</td>
                  <td className="px-4 py-2 text-ink">{formatData(p.criado_em)}</td>
                  <td className="px-4 py-2">
                    <span className="inline-block rounded bg-ok/10 px-2 py-1 text-xs font-medium text-ok">
                      {p.status}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    {p.status === "Pendente" ? (
                      <div className="flex gap-2">
                        <form action={decidirParceria}>
                          <input type="hidden" name="id" value={p.id} />
                          <input type="hidden" name="status" value="Aprovada" />
                          <button
                            type="submit"
                            className="rounded border border-line px-2 py-1 text-xs font-semibold text-ok hover:bg-ok/10"
                          >
                            Aprovar
                          </button>
                        </form>
                        <form action={decidirParceria}>
                          <input type="hidden" name="id" value={p.id} />
                          <input type="hidden" name="status" value="Recusada" />
                          <button
                            type="submit"
                            className="rounded border border-line px-2 py-1 text-xs font-semibold text-erro hover:bg-erro/10"
                          >
                            Recusar
                          </button>
                        </form>
                      </div>
                    ) : (
                      "—"
                    )}
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
