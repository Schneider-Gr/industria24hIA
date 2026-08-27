import { createClient } from "@/lib/supabase/server";
import { getMinhaLoja } from "@/lib/auth";
import { PageTitle, SemLoja } from "@/components/seller/states";
import { EmptyState, Table } from "@/components/admin/ui";
import { UploadListaTransportadoras, UploadTabelaFrete } from "@/components/admin/UploadTransportadoras";
import {
  importarListaTransportadorasSeller,
  pravisualizarTabelaFreteSeller,
  confirmarImportTabelaFreteSeller,
} from "./actions";

// Spec seller-transportadoras/override-tabela-frete: loja enxerga as
// transportadoras globais (faixas do admin, somente leitura) e as próprias,
// sobe a tabela de frete própria, e pode sobrescrever faixa de uma global
// subindo/editando com a mesma transportadora — grava com loja_id da loja
// (RLS transportadora_faixas_frete_seller_own, 0145) e passa a ter
// prioridade no cálculo de checkout (cotar_frete_tabela, 0146).
export default async function SellerTransportadorasPage() {
  const loja = await getMinhaLoja();
  if (!loja) return <SemLoja />;

  const supabase = await createClient();
  const [{ data: globais }, { data: proprias }] = await Promise.all([
    supabase.from("transportadoras").select("id, nome, fonte, ativo").is("loja_id", null).order("nome"),
    supabase.from("transportadoras").select("id, nome, fonte, ativo").eq("loja_id", loja.id).order("nome"),
  ]);

  const todas = [...(globais ?? []), ...(proprias ?? [])];

  return (
    <div>
      <PageTitle title="Transportadoras" subtitle="Tabelas de frete globais e da sua loja" />

      <div className="mb-6 flex flex-col gap-4 rounded-lg border border-line bg-surface p-4">
        <UploadListaTransportadoras action={importarListaTransportadorasSeller} />
        <UploadTabelaFrete
          transportadoras={todas.map((t) => ({ id: t.id, nome: t.nome }))}
          pravisualizarAction={pravisualizarTabelaFreteSeller}
          confirmarAction={confirmarImportTabelaFreteSeller}
        />
        <p className="text-xs text-muted">
          Para sobrescrever uma faixa de transportadora global só para sua loja, suba a tabela de frete
          selecionando essa transportadora — as faixas gravadas para sua loja têm prioridade sobre as globais
          no cálculo do checkout.
        </p>
      </div>

      <h2 className="mb-2 text-sm font-semibold">Transportadoras globais (Indústria 24h)</h2>
      {(globais ?? []).length === 0 ? (
        <EmptyState>Nenhuma transportadora global cadastrada.</EmptyState>
      ) : (
        <Table headers={["Nome", "Fonte", "Status"]}>
          {(globais ?? []).map((t) => (
            <tr key={t.id} className="text-ink dark:text-ink-2">
              <td className="px-4 py-[9px]">{t.nome}</td>
              <td className="px-4 py-[9px] text-sm text-muted">{t.fonte}</td>
              <td className="px-4 py-[9px] text-sm">{t.ativo ? "Ativa" : "Inativa"}</td>
            </tr>
          ))}
        </Table>
      )}

      <h2 className="mt-6 mb-2 text-sm font-semibold">Transportadoras da sua loja</h2>
      {(proprias ?? []).length === 0 ? (
        <EmptyState>Nenhuma transportadora própria cadastrada.</EmptyState>
      ) : (
        <Table headers={["Nome", "Fonte", "Status"]}>
          {(proprias ?? []).map((t) => (
            <tr key={t.id} className="text-ink dark:text-ink-2">
              <td className="px-4 py-[9px]">{t.nome}</td>
              <td className="px-4 py-[9px] text-sm text-muted">{t.fonte}</td>
              <td className="px-4 py-[9px] text-sm">{t.ativo ? "Ativa" : "Inativa"}</td>
            </tr>
          ))}
        </Table>
      )}
    </div>
  );
}
