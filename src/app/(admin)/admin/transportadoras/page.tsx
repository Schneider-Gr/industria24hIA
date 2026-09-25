import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { ErrorState } from "@/components/ErrorState";
import { PageHeader, Table, EmptyState, StatusBadge } from "@/components/admin/ui";
import { UploadListaTransportadoras, UploadTabelaFrete } from "@/components/admin/UploadTransportadoras";
import { FormTransportadora } from "@/components/seller/transportadoras/FormTransportadora";
import {
  salvarTransportadora,
  alternarTransportadora,
  importarListaTransportadoras,
  pravisualizarTabelaFrete,
  confirmarImportTabelaFrete,
  moderarTransportadoraPropria,
} from "./actions";

export const dynamic = "force-dynamic";

const FONTE_LABEL: Record<string, string> = {
  interna: "Interna (% por CEP)",
  mercado_envios: "Mercado Envios",
  uber_direct: "Uber Direct",
  tabela_importada: "Tabela de faixas",
};

const dataBr = (d: string | null) => (d ? d.slice(0, 10).split("-").reverse().join("/") : "—");

export default async function TransportadorasPage() {
  if (!isSupabaseConfigured) {
    return <ErrorState title="Supabase não configurado" detail="Defina as variáveis do Supabase em web/.env.local." />;
  }

  const supabase = await createClient();
  const [{ data: globais, error }, { data: proprias }, { data: ativacoes }] = await Promise.all([
    supabase
      .from("transportadoras")
      .select("id, nome, ativo, fonte, prazo_dias, fake, encerra_em, tabela_atualizada_em")
      .is("loja_id", null)
      .order("nome"),
    supabase
      .from("transportadoras")
      .select("id, nome, ativo, desativada_por_admin, motivo_desativacao, lojas(nome)")
      .not("loja_id", "is", null)
      .order("nome")
      .limit(300),
    supabase.from("loja_transportadoras").select("transportadora_id").eq("ativo", true),
  ]);

  if (error) return <ErrorState title="Falha ao carregar transportadoras" detail={error.message} />;

  const linhas = globais ?? [];
  const lojasPor = new Map<string, number>();
  for (const a of ativacoes ?? []) lojasPor.set(a.transportadora_id, (lojasPor.get(a.transportadora_id) ?? 0) + 1);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Transportadoras"
        subtitle="Globais negociadas pela plataforma e moderação das transportadoras das lojas"
        count={linhas.length}
      />

      <section className="rounded-lg border border-line bg-surface p-4">
        <h2 className="mb-3 text-sm font-semibold">Cadastrar transportadora global</h2>
        <FormTransportadora
          action={salvarTransportadora}
          rotuloBotao="Cadastrar global"
          extra={
            <label className="text-sm">
              <span className="mb-1 block text-xs text-muted">Encerra em (opcional)</span>
              <input
                type="date"
                name="encerra_em"
                className="rounded border border-line bg-surface px-2 py-1 text-sm outline-none focus:border-roxo-800"
              />
              <span className="mt-0.5 block text-[11px] text-muted">
                As lojas que usam são avisadas 7 dias antes; na data ela sai do checkout.
              </span>
            </label>
          }
        />
      </section>

      <section className="flex flex-col gap-4 rounded-lg border border-line bg-surface p-4">
        <h2 className="text-sm font-semibold">Tabela de frete de uma global</h2>
        <UploadTabelaFrete
          transportadoras={linhas
            .filter((t) => t.fonte !== "uber_direct" && t.fonte !== "mercado_envios")
            .map((t) => ({ id: t.id, nome: t.nome }))}
          pravisualizarAction={pravisualizarTabelaFrete}
          confirmarAction={confirmarImportTabelaFrete}
        />
        <UploadListaTransportadoras action={importarListaTransportadoras} />
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold">Globais</h2>
        {linhas.length === 0 ? (
          <EmptyState>Nenhuma transportadora global cadastrada.</EmptyState>
        ) : (
          <Table headers={["Nome", "Fonte", "Lojas usando", "Tabela", "Encerra", "Status", "", ""]}>
            {linhas.map((t) => (
              <tr key={t.id} className="text-ink dark:text-ink-2">
                <td className="px-4 py-[9px]">
                  {t.nome}
                  {t.fake && <span className="ml-2 text-xs text-muted">(demo)</span>}
                </td>
                <td className="px-4 py-[9px] text-sm text-muted">{FONTE_LABEL[t.fonte] ?? t.fonte}</td>
                <td className="px-4 py-[9px] text-sm">{lojasPor.get(t.id) ?? 0}</td>
                <td className="px-4 py-[9px] text-sm">{dataBr(t.tabela_atualizada_em)}</td>
                <td className="px-4 py-[9px] text-sm">{dataBr(t.encerra_em)}</td>
                <td className="px-4 py-[9px]">
                  <StatusBadge status={t.ativo ? "Ativa" : "Inativa"} />
                </td>
                <td className="px-4 py-[9px]">
                  <Link href={`/admin/transportadoras/${t.id}`} className="text-xs text-roxo-800 hover:underline">
                    Editar e faixas
                  </Link>
                </td>
                <td className="px-4 py-[9px] text-right">
                  <form action={alternarTransportadora} className="inline">
                    <input type="hidden" name="id" value={t.id} />
                    <input type="hidden" name="ativo" value={String(t.ativo)} />
                    <button type="submit" className="rounded border border-line px-2 py-1 text-xs hover:bg-surface">
                      {t.ativo ? "Desativar" : "Ativar"}
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </Table>
        )}
      </section>

      <section>
        <h2 className="mb-1 text-sm font-semibold">Transportadoras das lojas</h2>
        <p className="mb-2 text-xs text-muted">
          Entram no checkout sem aprovação. Desative com motivo quando o frete for irreal ou a transportadora não
          existir; o seller vê o motivo e só o admin reativa.
        </p>
        {(proprias ?? []).length === 0 ? (
          <EmptyState>Nenhuma loja cadastrou transportadora própria.</EmptyState>
        ) : (
          <Table headers={["Nome", "Loja", "Status", ""]}>
            {(proprias ?? []).map((t) => (
              <tr key={t.id} className="text-ink dark:text-ink-2">
                <td className="px-4 py-[9px]">
                  <Link href={`/admin/transportadoras/${t.id}`} className="text-roxo-800 hover:underline">
                    {t.nome}
                  </Link>
                </td>
                <td className="px-4 py-[9px] text-sm">{t.lojas?.nome ?? "—"}</td>
                <td className="px-4 py-[9px] text-sm">
                  {t.desativada_por_admin
                    ? `Desativada pelo admin: ${t.motivo_desativacao ?? ""}`
                    : t.ativo
                      ? "Ativa"
                      : "Inativa pelo seller"}
                </td>
                <td className="px-4 py-[9px]">
                  <form action={moderarTransportadoraPropria} className="flex items-center gap-2">
                    <input type="hidden" name="id" value={t.id} />
                    {t.desativada_por_admin ? (
                      <>
                        <input type="hidden" name="acao" value="reativar" />
                        <button type="submit" className="rounded border border-line px-2 py-1 text-xs hover:bg-surface">
                          Reativar
                        </button>
                      </>
                    ) : (
                      <>
                        <input type="hidden" name="acao" value="desativar" />
                        <input
                          name="motivo"
                          required
                          placeholder="Motivo"
                          className="w-40 rounded border border-line bg-surface px-2 py-1 text-xs"
                        />
                        <button type="submit" className="rounded border border-line px-2 py-1 text-xs hover:bg-surface">
                          Desativar
                        </button>
                      </>
                    )}
                  </form>
                </td>
              </tr>
            ))}
          </Table>
        )}
      </section>
    </div>
  );
}
