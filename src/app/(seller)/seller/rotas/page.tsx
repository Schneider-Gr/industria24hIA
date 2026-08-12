import { createClient } from "@/lib/supabase/server";
import { getMinhaLoja } from "@/lib/auth";
import { PageTitle, SemLoja } from "@/components/seller/states";
import { StatusBadge, EmptyState } from "@/components/admin/ui";
import { formatBRL } from "@/components/seller/format";
import { atribuirRota } from "./actions";

type Rota = {
  id: string;
  pedido_id: string;
  origem_cep: string | null;
  destino_cep: string | null;
  frete_calculado: number | null;
  status: string;
  criado_em: string;
};

type Parceiro = { origem: "afiliado" | "parceiro"; id: string; nome: string; nota_media: number | null };

export default async function SellerRotasPage() {
  const loja = await getMinhaLoja();
  if (!loja) return <SemLoja />;
  const supabase = await createClient();

  const { data: pedidosDaLoja } = await supabase.from("pedidos").select("id").eq("loja_id", loja.id);
  const pedidoIds = (pedidosDaLoja ?? []).map((p: { id: string }) => p.id);

  const { data: rotas } = pedidoIds.length
    ? await supabase
        .from("rotas")
        .select("id, pedido_id, origem_cep, destino_cep, frete_calculado, status, criado_em")
        .in("pedido_id", pedidoIds)
        .order("criado_em", { ascending: false })
    : { data: [] };

  const { data: disponiveis } = await supabase.rpc("parceiros_disponiveis_loja", { p_loja_id: loja.id });

  const lista = (rotas ?? []) as Rota[];
  const pendentes = lista.filter((r) => r.status === "Pendente");
  const atribuidas = lista.filter((r) => r.status !== "Pendente");
  const parceiros = (disponiveis ?? []) as Parceiro[];

  return (
    <div className="space-y-8">
      <PageTitle
        title="Rotas (logística)"
        subtitle="Pedidos pagos com entrega — escolha quem atende cada rota"
      />

      <section>
        <h2 className="text-lg font-bold mb-3">Pendentes de atribuição ({pendentes.length})</h2>
        {pendentes.length === 0 ? (
          <EmptyState>Nenhuma rota aguardando atribuição.</EmptyState>
        ) : parceiros.length === 0 ? (
          <EmptyState>
            Nenhum afiliado logístico aprovado ou parceiro de plataforma disponível ainda. Aprove um
            afiliado em Afiliados produtos ou aguarde um parceiro se cadastrar.
          </EmptyState>
        ) : (
          <div className="space-y-3">
            {pendentes.map((r) => (
              <div key={r.id} className="rounded border border-borda bg-white p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold">
                    {r.origem_cep} → {r.destino_cep}
                  </p>
                  <StatusBadge status={r.status} />
                </div>
                {r.frete_calculado != null && (
                  <p className="mt-1 text-sm text-muted">
                    Frete calculado: <span className="num font-semibold">{formatBRL(r.frete_calculado)}</span>
                  </p>
                )}
                <form action={atribuirRota} className="mt-3 flex flex-wrap items-center gap-2">
                  <input type="hidden" name="rota_id" value={r.id} />
                  <select
                    name="parceiro"
                    required
                    className="min-w-56 rounded border border-borda px-3 py-1.5 text-sm"
                  >
                    <option value="">Selecione um parceiro…</option>
                    {parceiros.map((p) => (
                      <option key={`${p.origem}:${p.id}`} value={`${p.origem}:${p.id}`}>
                        {p.nome} — {p.origem === "afiliado" ? "afiliado da loja" : "parceiro de plataforma"}
                        {p.nota_media ? ` · ★ ${p.nota_media}` : ""}
                      </option>
                    ))}
                  </select>
                  <button className="rounded bg-sinal px-4 py-1.5 text-sm font-semibold text-white hover:bg-sinal-escuro">
                    Atribuir
                  </button>
                </form>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-lg font-bold mb-3">Atribuídas ({atribuidas.length})</h2>
        {atribuidas.length === 0 ? (
          <EmptyState>Nenhuma rota atribuída ainda.</EmptyState>
        ) : (
          <div className="space-y-2">
            {atribuidas.map((r) => (
              <div key={r.id} className="flex items-center justify-between rounded border border-borda bg-white p-3 text-sm">
                <span>
                  {r.origem_cep} → {r.destino_cep}
                  {r.frete_calculado != null && (
                    <> · <span className="num">{formatBRL(r.frete_calculado)}</span></>
                  )}
                </span>
                <StatusBadge status={r.status} />
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
