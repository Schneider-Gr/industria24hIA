import Link from "next/link";
import * as Sentry from "@sentry/nextjs";
import { VitrineHeader, VitrineFooter } from "@/components/vitrine/ui";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { ErrorState } from "@/components/ErrorState";
import { formatBRL } from "@/components/seller/format";
import type { Database } from "@/lib/supabase/database.types";

export const dynamic = "force-dynamic";

type PedidoResumo = Pick<
  Database["public"]["Views"]["pedidos_cliente"]["Row"],
  "id" | "id_venda" | "data" | "status_pedido" | "valor_pedido"
>;

// Listagem "Meus Pedidos" do comprador (PRD 009 US00) — antes só existia a
// página de um pedido individual (/pedido/[id]), acessada por link direto.
export default async function MeusPedidosPage() {
  if (!isSupabaseConfigured) {
    return <ErrorState title="Supabase não configurado" />;
  }

  const user = await getUser();
  if (!user) {
    return (
      <Shell>
        <ErrorState title="Faça login" detail="Entre para ver seus pedidos." />
        <p className="mt-3 text-center">
          <Link href="/login?next=/meus-pedidos" className="text-lm-azul underline">
            Ir para o login
          </Link>
        </p>
      </Shell>
    );
  }

  const supabase = await createClient();
  let pedidos: PedidoResumo[] | null = null;
  try {
    ({ data: pedidos } = await supabase
      .from("pedidos_cliente")
      .select("id, id_venda, data, status_pedido, valor_pedido")
      .order("data", { ascending: false }));
  } catch (erro) {
    Sentry.captureException(erro, { tags: { area: "meus_pedidos", step: "query" } });
    return (
      <Shell>
        <ErrorState
          title="Não foi possível carregar seus pedidos"
          detail="Houve uma falha temporária. Recarregue a página em instantes."
        />
      </Shell>
    );
  }

  return (
    <Shell>
      <h1 className="font-display text-2xl font-bold text-ink">Meus Pedidos</h1>

      {(pedidos ?? []).length === 0 ? (
        <div className="mt-6 rounded border border-line bg-white p-8 text-center">
          <p className="text-sm text-muted">Você ainda não fez nenhuma compra.</p>
          <p className="mt-3">
            <Link href="/" className="text-lm-azul underline underline-offset-2">
              Ir para a vitrine
            </Link>
          </p>
        </div>
      ) : (
        <ul className="mt-4 space-y-3">
          {(pedidos ?? []).map((p) => (
            <li key={p.id}>
              <Link
                href={`/pedido/${p.id}`}
                className="flex items-center justify-between gap-3 rounded border border-line bg-white p-4 hover:border-lm-azul"
              >
                <div>
                  <p className="font-semibold text-ink">
                    Pedido <span className="num">{p.id_venda}</span>
                  </p>
                  <p className="text-sm text-muted">
                    {p.data ? new Date(p.data).toLocaleDateString("pt-BR") : "—"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="num font-semibold text-ink">{formatBRL(p.valor_pedido)}</p>
                  <p className="text-xs text-muted">{p.status_pedido}</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-[#FAFAF9]">
      <VitrineHeader />
      <main className="mx-auto w-full max-w-[700px] flex-1 px-4 py-8">{children}</main>
      <VitrineFooter />
    </div>
  );
}
