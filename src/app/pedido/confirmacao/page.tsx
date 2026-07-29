import Link from "next/link";
import { VitrineHeader, VitrineFooter } from "@/components/vitrine/ui";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { ErrorState } from "@/components/ErrorState";
import { formatBRL } from "@/components/seller/format";
import { LimparCarrinhoAoMontar } from "@/app/pedido/[id]/limpar";

export const dynamic = "force-dynamic";

// Checkout multi-loja (2026-07-29) gera N pedidos, um por loja — esta página
// lista os N pedidos criados numa mesma compra em vez de redirecionar para
// um único /pedido/{id}, que assume 1 pedido.
export default async function ConfirmacaoPedidosPage({
  searchParams,
}: {
  searchParams: Promise<{ ids?: string }>;
}) {
  if (!isSupabaseConfigured) {
    return <ErrorState title="Supabase não configurado" />;
  }
  const { ids } = await searchParams;
  const pedidoIds = (ids ?? "").split(",").filter(Boolean);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return (
      <Shell>
        <ErrorState
          title="Faça login"
          detail="Entre com a conta usada na compra para ver seus pedidos."
        />
      </Shell>
    );
  }

  const { data: pedidos } = await supabase
    .from("pedidos_cliente")
    .select("id, id_venda, status_pedido, valor_pedido")
    .in("id", pedidoIds);

  if (!pedidos?.length) {
    return (
      <Shell>
        <ErrorState title="Pedidos não encontrados" />
      </Shell>
    );
  }

  const totalGeral = pedidos.reduce((s, p) => s + Number(p.valor_pedido), 0);

  return (
    <Shell>
      <LimparCarrinhoAoMontar />
      <p className="text-sm text-muted">
        Sua compra teve itens de {pedidos.length} lojas — foram criados {pedidos.length} pedidos
        separados, cada um com acompanhamento próprio.
      </p>
      <ul className="mt-4 space-y-3">
        {pedidos.map((p) => (
          <li key={p.id} className="rounded-md border border-line bg-white p-4">
            <Link href={`/pedido/${p.id}`} className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-ink">Pedido {p.id_venda}</p>
                <p className="text-[13px] text-muted">{p.status_pedido}</p>
              </div>
              <p className="num text-base font-bold text-ink">{formatBRL(Number(p.valor_pedido))}</p>
            </Link>
          </li>
        ))}
      </ul>
      <div className="mt-6 border-t border-line pt-4 text-right">
        <p className="text-sm text-muted">Total geral</p>
        <p className="num text-2xl font-bold text-ink">{formatBRL(totalGeral)}</p>
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-[#FAFAF9]">
      <VitrineHeader />
      <main className="mx-auto w-full max-w-[700px] flex-1 px-4 py-8">
        <h1 className="font-display mb-4 text-2xl font-bold text-ink">Seus pedidos</h1>
        {children}
      </main>
      <VitrineFooter />
    </div>
  );
}
