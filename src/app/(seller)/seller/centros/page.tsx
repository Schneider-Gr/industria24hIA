import { getUser, getMinhaLoja } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ErrorState } from "@/components/ErrorState";
import { PageTitle, PrecisaLogin, SemLoja, VazioBox } from "@/components/seller/states";
import { CentroForm } from "@/components/seller/CentroForm";
import { formatData } from "@/components/seller/format";

export const dynamic = "force-dynamic";

export default async function CentrosPage() {
  const user = await getUser();
  if (!user) return <PrecisaLogin />;

  const loja = await getMinhaLoja();
  if (!loja) return <SemLoja />;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("centros_distribuicao")
    .select("id, nome, localizacao, status, created_at")
    .eq("loja_id", loja.id)
    .order("created_at", { ascending: false });

  if (error) {
    return <ErrorState title="Falha ao carregar centros" detail={error.message} />;
  }

  const centros = data ?? [];

  return (
    <div>
      <PageTitle
        title="Centro de distribuição"
        subtitle="Cadastre os pontos de onde seus produtos são despachados."
      />

      <div className="mb-8">
        <CentroForm />
      </div>

      {centros.length === 0 ? (
        <VazioBox>Nenhum centro de distribuição cadastrado.</VazioBox>
      ) : (
        <div className="overflow-x-auto rounded border border-line">
          <table className="w-full text-sm">
            <thead className="bg-surface">
              <tr>
                <th className="px-4 py-2 uppercase text-[11px] tracking-wider text-muted font-semibold">Nome</th>
                <th className="px-4 py-2 uppercase text-[11px] tracking-wider text-muted font-semibold">Localização</th>
                <th className="px-4 py-2 uppercase text-[11px] tracking-wider text-muted font-semibold">Cadastro</th>
                <th className="px-4 py-2 uppercase text-[11px] tracking-wider text-muted font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {centros.map((c) => (
                <tr key={c.id} className="border-t border-line">
                  <td className="px-4 py-2 text-ink">{c.nome}</td>
                  <td className="px-4 py-2 text-ink">{c.localizacao ?? "—"}</td>
                  <td className="px-4 py-2 text-ink">{formatData(c.created_at)}</td>
                  <td className="px-4 py-2">
                    <span className="inline-block rounded bg-ok/10 px-2 py-1 text-xs font-medium text-ok">
                      {c.status}
                    </span>
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
