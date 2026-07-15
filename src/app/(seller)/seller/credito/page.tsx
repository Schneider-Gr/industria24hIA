import { getUser, getMinhaLoja } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ErrorState } from "@/components/ErrorState";
import { PageTitle, PrecisaLogin, SemLoja, VazioBox } from "@/components/seller/states";
import { CreditoForm } from "@/components/seller/CreditoForm";
import { formatBRL, formatData } from "@/components/seller/format";
import { cancelarCredito } from "./actions";

export const dynamic = "force-dynamic";

// Seção "Crédito" do Bubble (/version-test/seller): solicitações de crédito
// da empresa (aprovadas/pendentes) + lista geral. Schema desenhado do zero em
// 0049 — dado financeiro sensível, decisão (aprovar/recusar) é exclusiva de
// admin (guard_status_financeiro_seller); o seller só cria e cancela a própria
// solicitação Pendente.
export default async function CreditoPage() {
  const user = await getUser();
  if (!user) return <PrecisaLogin />;

  const loja = await getMinhaLoja();
  if (!loja) return <SemLoja />;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("solicitacoes_credito")
    .select("id, valor_solicitado, finalidade, prazo_meses, status, criado_em")
    .eq("loja_id", loja.id)
    .order("criado_em", { ascending: false });

  if (error) {
    return <ErrorState title="Falha ao carregar solicitações de crédito" detail={error.message} />;
  }

  const solicitacoes = data ?? [];

  return (
    <div>
      <PageTitle title="Crédito" subtitle="Solicitações de crédito da sua empresa." />

      <div className="mb-8">
        <CreditoForm />
      </div>

      {solicitacoes.length === 0 ? (
        <VazioBox>Nenhuma solicitação de crédito ainda.</VazioBox>
      ) : (
        <div className="overflow-x-auto rounded border border-line">
          <table className="w-full text-sm">
            <thead className="bg-surface">
              <tr>
                <th className="px-4 py-2 uppercase text-[11px] tracking-wider text-muted font-semibold">Valor</th>
                <th className="px-4 py-2 uppercase text-[11px] tracking-wider text-muted font-semibold">Finalidade</th>
                <th className="px-4 py-2 uppercase text-[11px] tracking-wider text-muted font-semibold">Prazo</th>
                <th className="px-4 py-2 uppercase text-[11px] tracking-wider text-muted font-semibold">Data</th>
                <th className="px-4 py-2 uppercase text-[11px] tracking-wider text-muted font-semibold">Status</th>
                <th className="px-4 py-2 uppercase text-[11px] tracking-wider text-muted font-semibold">Ações</th>
              </tr>
            </thead>
            <tbody>
              {solicitacoes.map((s) => (
                <tr key={s.id} className="border-t border-line">
                  <td className="px-4 py-2 text-ink">{formatBRL(s.valor_solicitado)}</td>
                  <td className="px-4 py-2 text-ink">{s.finalidade ?? "—"}</td>
                  <td className="px-4 py-2 text-ink">{s.prazo_meses ? `${s.prazo_meses} meses` : "—"}</td>
                  <td className="px-4 py-2 text-ink">{formatData(s.criado_em)}</td>
                  <td className="px-4 py-2">
                    <span className="inline-block rounded bg-ok/10 px-2 py-1 text-xs font-medium text-ok">
                      {s.status}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    {s.status === "Pendente" ? (
                      <form action={cancelarCredito}>
                        <input type="hidden" name="id" value={s.id} />
                        <button
                          type="submit"
                          className="rounded border border-line px-2 py-1 text-xs font-semibold text-erro hover:bg-erro/10"
                        >
                          Cancelar
                        </button>
                      </form>
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
