import { getUser, getMinhaLoja } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ErrorState } from "@/components/ErrorState";
import { PageTitle, PrecisaLogin, SemLoja, VazioBox } from "@/components/seller/states";
import { formatBRL, formatData } from "@/components/seller/format";
import { AdsForm } from "@/components/seller/AdsForm";
import { pausarPatrocinio, reativarPatrocinio } from "./actions";

export const dynamic = "force-dynamic";

// Produtos patrocinados: o seller escolhe produtos + orçamento/período aqui.
// A campanha real na Meta Ads (conta industria24horas@gmail.com) exige OAuth
// explícito do usuário via MCP meta-ads — não é criada automaticamente,
// status fica "Pendente" até essa integração ser autorizada e ligada.
export default async function AdsPage() {
  const user = await getUser();
  if (!user) return <PrecisaLogin />;

  const loja = await getMinhaLoja();
  if (!loja) return <SemLoja />;

  const supabase = await createClient();
  const [produtosRes, patrociniosRes] = await Promise.all([
    supabase
      .from("produtos")
      .select("id, nome")
      .eq("loja_id", loja.id)
      .eq("status_produto", "Aprovado")
      .order("nome"),
    supabase
      .from("produtos_patrocinados")
      .select("id, orcamento_diario, data_inicio, data_fim, status, criado_em, produtos(nome)")
      .eq("loja_id", loja.id)
      .order("criado_em", { ascending: false }),
  ]);

  if (produtosRes.error) {
    return <ErrorState title="Falha ao carregar produtos" detail={produtosRes.error.message} />;
  }
  if (patrociniosRes.error) {
    return <ErrorState title="Falha ao carregar patrocínios" detail={patrociniosRes.error.message} />;
  }

  const produtos = produtosRes.data ?? [];
  const patrocinios = patrociniosRes.data ?? [];

  return (
    <div>
      <PageTitle
        title="Publicidade"
        subtitle="Escolha produtos para patrocinar e apareça primeiro nas buscas."
      />

      <div className="mb-4 rounded border border-line bg-surface p-4 text-sm text-ink-2">
        A campanha só entra no ar de verdade depois de conectar sua conta de anúncios (Meta Ads).
        Por enquanto, o pedido fica registrado como <strong>Pendente</strong>.
      </div>

      {produtos.length === 0 ? (
        <VazioBox>Cadastre e aprove um produto antes de anunciar.</VazioBox>
      ) : (
        <div className="mb-8">
          <AdsForm produtos={produtos} />
        </div>
      )}

      {patrocinios.length === 0 ? (
        <VazioBox>Nenhum produto patrocinado ainda.</VazioBox>
      ) : (
        <div className="overflow-x-auto rounded border border-line">
          <table className="w-full text-sm">
            <thead className="bg-surface">
              <tr>
                <th className="px-4 py-2 text-left text-[11px] uppercase tracking-wider text-muted font-semibold">Produto</th>
                <th className="px-4 py-2 text-right text-[11px] uppercase tracking-wider text-muted font-semibold">Orçamento/dia</th>
                <th className="px-4 py-2 text-left text-[11px] uppercase tracking-wider text-muted font-semibold">Início</th>
                <th className="px-4 py-2 text-left text-[11px] uppercase tracking-wider text-muted font-semibold">Fim</th>
                <th className="px-4 py-2 text-left text-[11px] uppercase tracking-wider text-muted font-semibold">Status</th>
                <th className="px-4 py-2 text-right text-[11px] uppercase tracking-wider text-muted font-semibold">Ações</th>
              </tr>
            </thead>
            <tbody>
              {patrocinios.map((p) => (
                <tr key={p.id} className="border-t border-line">
                  <td className="px-4 py-2 text-ink">{p.produtos?.nome ?? "—"}</td>
                  <td className="px-4 py-2 text-right num text-ink">{formatBRL(p.orcamento_diario)}</td>
                  <td className="px-4 py-2 text-ink">{formatData(p.data_inicio)}</td>
                  <td className="px-4 py-2 text-ink">{p.data_fim ? formatData(p.data_fim) : "—"}</td>
                  <td className="px-4 py-2">
                    <span className="inline-block rounded bg-ok/10 px-2 py-1 text-xs font-medium text-ok">
                      {p.status}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right">
                    {p.status === "Pendente" && (
                      <form action={pausarPatrocinio}>
                        <input type="hidden" name="id" value={p.id} />
                        <button
                          type="submit"
                          className="rounded border border-line px-2 py-1 text-xs font-semibold text-ink-2 hover:bg-surface"
                        >
                          Pausar
                        </button>
                      </form>
                    )}
                    {p.status === "Pausado" && (
                      <form action={reativarPatrocinio}>
                        <input type="hidden" name="id" value={p.id} />
                        <button
                          type="submit"
                          className="rounded border border-line px-2 py-1 text-xs font-semibold text-roxo-800 hover:bg-surface"
                        >
                          Reativar
                        </button>
                      </form>
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
