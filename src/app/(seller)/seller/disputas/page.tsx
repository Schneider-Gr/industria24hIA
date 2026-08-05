import Link from "next/link";
import { getUser, getMinhaLoja } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ErrorState } from "@/components/ErrorState";
import { PageTitle, PrecisaLogin, SemLoja, VazioBox } from "@/components/seller/states";
import { StatusBadge } from "@/components/admin/ui";
import { formatData } from "@/components/seller/format";

export const dynamic = "force-dynamic";

// Fila de disputas da loja (PRD 009 US02) — padrão de listagem de
// src/app/(seller)/seller/pedidos/page.tsx.
export default async function SellerDisputasPage() {
  const user = await getUser();
  if (!user) return <PrecisaLogin />;

  const loja = await getMinhaLoja();
  if (!loja) return <SemLoja />;

  const supabase = await createClient();
  const { data: disputas, error } = await supabase
    .from("disputas")
    .select("id, motivo, status, aberta_em, sla_loja_vence_em, comprador_id, pedido_id")
    .eq("loja_id", loja.id)
    .order("aberta_em", { ascending: false });

  if (error) return <ErrorState title="Falha ao carregar disputas" detail={error.message} />;

  return (
    <div>
      <PageTitle title="Pós-venda" subtitle="Disputas abertas pelos compradores da sua loja" />

      {(disputas ?? []).length === 0 ? (
        <VazioBox>Nenhuma disputa aberta.</VazioBox>
      ) : (
        <div className="overflow-x-auto rounded border border-line">
          <table className="w-full text-sm">
            <thead className="bg-surface">
              <tr>
                <th className="px-4 py-2 text-left text-[11px] font-medium uppercase tracking-wider text-muted">Motivo</th>
                <th className="px-4 py-2 text-left text-[11px] font-medium uppercase tracking-wider text-muted">Aberta em</th>
                <th className="px-4 py-2 text-left text-[11px] font-medium uppercase tracking-wider text-muted">Prazo de resposta</th>
                <th className="px-4 py-2 text-left text-[11px] font-medium uppercase tracking-wider text-muted">Status</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody>
              {(disputas ?? []).map((d) => (
                <tr key={d.id} className="border-t border-line">
                  <td className="px-4 py-2">{d.motivo}</td>
                  <td className="px-4 py-2">{formatData(d.aberta_em)}</td>
                  <td className="px-4 py-2">{formatData(d.sla_loja_vence_em)}</td>
                  <td className="px-4 py-2">
                    <StatusBadge status={d.status} />
                  </td>
                  <td className="px-4 py-2 text-right">
                    <Link href={`/seller/disputas/${d.id}`} className="text-lm-azul underline">
                      Ver e responder
                    </Link>
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
