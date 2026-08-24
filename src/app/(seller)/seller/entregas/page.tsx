import { createClient } from "@/lib/supabase/server";
import { getMinhaLoja } from "@/lib/auth";
import { PageTitle, SemLoja } from "@/components/seller/states";
import { StatusBadge, EmptyState } from "@/components/admin/ui";
import { formatBRL } from "@/components/seller/format";

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- corridas/rotas.uber_* (0039/0103/0138) fora dos tipos gerados
type Db = any;

type Corrida = {
  id: string;
  pedido_id: string | null;
  origem_endereco: string;
  destino_endereco: string;
  preco_final: number | null;
  status: string;
  criado_em: string;
};

type RotaUberDirect = {
  pedido_id: string;
  uber_status: string | null;
  uber_tracking_url: string | null;
};

// PRD 008 §7: até esta página, o seller não tinha onde ver a entrega do
// próprio pedido (nem corrida automática, nem Uber Direct) — só o
// comprador via /corridas e o parceiro via /parceiro. Leitura da própria
// loja liberada pela policy corridas_seller_read (migration 0138).
export default async function SellerEntregasPage() {
  const loja = await getMinhaLoja();
  if (!loja) return <SemLoja />;
  const supabase = (await createClient()) as Db;

  const { data: pedidosDaLoja } = await supabase.from("pedidos").select("id").eq("loja_id", loja.id);
  const pedidoIds = (pedidosDaLoja ?? []).map((p: { id: string }) => p.id);

  const [{ data: corridas }, { data: rotasUberDirect }] = pedidoIds.length
    ? await Promise.all([
        supabase
          .from("corridas")
          .select("id, pedido_id, origem_endereco, destino_endereco, preco_final, status, criado_em")
          .in("pedido_id", pedidoIds)
          .order("criado_em", { ascending: false }),
        supabase
          .from("rotas")
          .select("pedido_id, uber_status, uber_tracking_url")
          .in("pedido_id", pedidoIds)
          .not("uber_delivery_id", "is", null),
      ])
    : [{ data: [] }, { data: [] }];

  const listaCorridas = (corridas ?? []) as Corrida[];
  const uberPorPedido = new Map(
    ((rotasUberDirect ?? []) as RotaUberDirect[]).map((r) => [r.pedido_id, r]),
  );

  return (
    <div className="space-y-8">
      <PageTitle
        title="Entregas"
        subtitle="Acompanhe a corrida (afiliado/parceiro) ou a entrega Uber Direct de cada pedido pago"
      />

      <section>
        <h2 className="text-lg font-bold mb-3">Corridas automáticas ({listaCorridas.length})</h2>
        {listaCorridas.length === 0 ? (
          <EmptyState>Nenhuma corrida despachada ainda para pedidos desta loja.</EmptyState>
        ) : (
          <div className="space-y-2">
            {listaCorridas.map((c) => (
              <div key={c.id} className="rounded border border-borda bg-white p-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span>
                    {c.origem_endereco} → {c.destino_endereco}
                  </span>
                  <StatusBadge status={c.status} />
                </div>
                {c.preco_final != null && (
                  <p className="mt-1 text-muted">
                    Frete: <span className="num font-semibold">{formatBRL(c.preco_final)}</span>
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-lg font-bold mb-3">Entregas Uber Direct ({uberPorPedido.size})</h2>
        {uberPorPedido.size === 0 ? (
          <EmptyState>Nenhuma entrega via Uber Direct para pedidos desta loja.</EmptyState>
        ) : (
          <div className="space-y-2">
            {[...uberPorPedido.values()].map((r) => (
              <div
                key={r.pedido_id}
                className="flex flex-wrap items-center justify-between gap-2 rounded border border-borda bg-white p-3 text-sm"
              >
                <span>Pedido {r.pedido_id.slice(0, 8)}</span>
                <div className="flex items-center gap-2">
                  {r.uber_status && <StatusBadge status={r.uber_status} />}
                  {r.uber_tracking_url && (
                    <a
                      href={r.uber_tracking_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sinal underline underline-offset-2"
                    >
                      Rastrear
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
