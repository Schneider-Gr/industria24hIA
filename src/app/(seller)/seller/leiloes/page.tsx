import { createClient } from "@/lib/supabase/server";
import { getMinhaLoja } from "@/lib/auth";
import { PageTitle, SemLoja } from "@/components/seller/states";
import { EmptyState } from "@/components/admin/ui";
import { formatBRL } from "@/components/seller/format";
import { darLanceLeilao } from "@/app/leilao/actions";

type Leilao = {
  id: string;
  titulo: string;
  descricao: string;
  volume: string;
  prazo_desejado: string | null;
  janela_fim: string;
  categoria_id: string | null;
};
type Lance = { leilao_id: string; preco: number; prazo: string };

export default async function SellerLeiloesPage() {
  const loja = await getMinhaLoja();
  if (!loja) return <SemLoja />;
  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- tabelas 0039 fora dos tipos gerados
  const db = supabase as any;

  const { data: leiloes } = await db
    .from("leiloes_fabricantes")
    .select("id, titulo, descricao, volume, prazo_desejado, janela_fim, categoria_id")
    .eq("status", "Aberto")
    .gt("janela_fim", new Date().toISOString())
    .order("janela_fim", { ascending: true });

  const { data: meusLances } = await db
    .from("leilao_lances")
    .select("leilao_id, preco, prazo")
    .eq("loja_id", loja.id);
  const lancePorLeilao = new Map<string, Lance>(
    ((meusLances ?? []) as Lance[]).map((l) => [l.leilao_id, l])
  );

  return (
    <div className="space-y-6">
      <PageTitle
        title="Leilões de compradores"
        subtitle="Pedidos de volume publicados por compradores — dê seu lance de preço e prazo"
      />
      {((leiloes ?? []) as Leilao[]).length === 0 ? (
        <EmptyState>Nenhum leilão aberto no momento.</EmptyState>
      ) : (
        <div className="space-y-3">
          {((leiloes ?? []) as Leilao[]).map((l) => {
            const meu = lancePorLeilao.get(l.id);
            return (
              <div key={l.id} className="rounded border border-borda bg-white p-4">
                <p className="text-sm font-semibold">{l.titulo}</p>
                <p className="mt-1 text-sm text-muted">
                  {l.descricao} · volume {l.volume} · encerra{" "}
                  {new Date(l.janela_fim).toLocaleString("pt-BR")}
                </p>
                {meu && (
                  <p className="mt-1 text-sm">
                    Seu lance atual: <span className="num font-semibold">{formatBRL(meu.preco)}</span> · {meu.prazo}
                  </p>
                )}
                <form action={darLanceLeilao} className="mt-3 flex flex-wrap items-center gap-2">
                  <input type="hidden" name="leilao_id" value={l.id} />
                  <input
                    name="preco" type="number" step="0.01" min="0.01" required
                    placeholder="Preço total (R$)"
                    className="w-40 rounded border border-borda px-3 py-1.5 text-sm"
                  />
                  <input
                    name="prazo" required placeholder="Prazo (ex.: 15 dias)"
                    className="w-40 rounded border border-borda px-3 py-1.5 text-sm"
                  />
                  <input
                    name="condicoes" placeholder="Condições (opcional)"
                    className="flex-1 min-w-40 rounded border border-borda px-3 py-1.5 text-sm"
                  />
                  <button className="rounded bg-laranja px-4 py-1.5 text-sm font-semibold text-white hover:bg-laranja-escuro">
                    {meu ? "Atualizar lance" : "Dar lance"}
                  </button>
                </form>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
