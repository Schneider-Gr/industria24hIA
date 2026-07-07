import { getUser, getMinhaLoja } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ErrorState } from "@/components/ErrorState";
import { KpiCard } from "@/components/seller/KpiCard";
import { PageTitle, PrecisaLogin, SemLoja, VazioBox } from "@/components/seller/states";

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

  const { data, error } = ids.length
    ? await supabase
        .from("afiliacoes")
        .select("id, produto_id, identificador, porcentagem, status")
        .in("produto_id", ids)
    : { data: [], error: null };

  if (error) {
    return <ErrorState title="Falha ao carregar afiliações" detail={error.message} />;
  }

  const afiliacoes = data ?? [];
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
              </tr>
            </thead>
            <tbody>
              {afiliacoes.map((a) => (
                <tr key={a.id} className="border-t border-line">
                  <td className="px-4 py-2">{a.identificador ?? "—"}</td>
                  <td className="px-4 py-2">{nomePorProduto.get(a.produto_id) ?? "—"}</td>
                  <td className="px-4 py-2 text-right num font-semibold">{a.porcentagem}%</td>
                  <td className="px-4 py-2">{a.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
