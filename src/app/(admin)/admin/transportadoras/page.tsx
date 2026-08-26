import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { ErrorState } from "@/components/ErrorState";
import { PageHeader, Table, EmptyState, StatusBadge } from "@/components/admin/ui";
import { UploadListaTransportadoras, UploadTabelaFrete } from "@/components/admin/UploadTransportadoras";
import {
  salvarTransportadora,
  alternarTransportadora,
  importarListaTransportadoras,
  importarTabelaFrete,
} from "./actions";

export const dynamic = "force-dynamic";

const inputCls =
  "rounded border border-line bg-surface px-2 py-1 text-sm outline-none focus:border-roxo-800";

const FONTE_LABEL: Record<string, string> = {
  interna: "Interna (% por CEP)",
  mercado_envios: "Mercado Envios",
};

export default async function TransportadorasPage() {
  if (!isSupabaseConfigured) {
    return (
      <ErrorState
        title="Supabase não configurado"
        detail="Defina as variáveis do Supabase em web/.env.local."
      />
    );
  }

  const supabase = await createClient();
  const { data: transportadoras, error } = await supabase
    .from("transportadoras")
    .select("id, nome, ativo, fonte, prazo_dias, loja_id, fake")
    .is("loja_id", null) // admin gerencia as globais; as de loja vivem no /seller
    .order("nome");

  if (error) {
    return <ErrorState title="Falha ao carregar transportadoras" detail={error.message} />;
  }

  const linhas = transportadoras ?? [];

  return (
    <div>
      <PageHeader
        title="Transportadoras"
        subtitle="Transportadoras globais disponíveis no checkout"
        count={linhas.length}
      />

      <div className="mb-6 flex flex-col gap-4 rounded-lg border border-line bg-surface p-4">
        <UploadListaTransportadoras action={importarListaTransportadoras} />
        <UploadTabelaFrete
          transportadoras={linhas.map((t) => ({ id: t.id, nome: t.nome }))}
          action={importarTabelaFrete}
        />
      </div>

      <form
        action={salvarTransportadora}
        className="mb-6 flex flex-wrap items-end gap-3 rounded-lg border border-line bg-surface p-4"
      >
        <label className="text-sm">
          <span className="mb-1 block text-xs text-muted">Nome</span>
          <input name="nome" required placeholder="Transportadora" className={`${inputCls} w-56`} />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-xs text-muted">Fonte</span>
          <select name="fonte" defaultValue="interna" className={inputCls}>
            <option value="interna">Interna (% por CEP)</option>
            <option value="mercado_envios">Mercado Envios (cotação)</option>
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-xs text-muted">Prazo (dias)</span>
          <input name="prazo_dias" type="number" min={0} className={`${inputCls} w-24`} />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="ativo" defaultChecked />
          Ativa
        </label>
        <button
          type="submit"
          className="rounded bg-roxo-800 px-4 py-1.5 text-sm font-semibold text-white hover:bg-roxo-900"
        >
          Adicionar
        </button>
      </form>

      {linhas.length === 0 ? (
        <EmptyState>Nenhuma transportadora global cadastrada.</EmptyState>
      ) : (
        <Table headers={["Nome", "Fonte", "Prazo", "Status", ""]}>
          {linhas.map((t) => (
            <tr key={t.id} className="text-ink dark:text-ink-2">
              <td className="px-4 py-[9px]">
                {t.nome}
                {t.fake && <span className="ml-2 text-xs text-muted">(demo)</span>}
              </td>
              <td className="px-4 py-[9px] text-sm text-muted">
                {FONTE_LABEL[t.fonte] ?? t.fonte}
              </td>
              <td className="px-4 py-[9px] text-sm">
                {t.prazo_dias == null ? "—" : `${t.prazo_dias} dia${t.prazo_dias === 1 ? "" : "s"}`}
              </td>
              <td className="px-4 py-[9px]">
                <StatusBadge status={t.ativo ? "Ativa" : "Inativa"} />
              </td>
              <td className="px-4 py-[9px] text-right">
                <form action={alternarTransportadora} className="inline">
                  <input type="hidden" name="id" value={t.id} />
                  <input type="hidden" name="ativo" value={String(t.ativo)} />
                  <button
                    type="submit"
                    className="rounded border border-line px-2 py-1 text-xs hover:bg-surface"
                  >
                    {t.ativo ? "Desativar" : "Ativar"}
                  </button>
                </form>
              </td>
            </tr>
          ))}
        </Table>
      )}
    </div>
  );
}
