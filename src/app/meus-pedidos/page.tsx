import Link from "next/link";
import * as Sentry from "@sentry/nextjs";
import { VitrineHeader, VitrineFooter } from "@/components/vitrine/ui";
import { BotaoComprarDeNovo } from "@/components/vitrine/BotaoComprarDeNovo";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { ErrorState } from "@/components/ErrorState";
import { formatBRL } from "@/components/seller/format";
import type { Database } from "@/lib/supabase/database.types";

export const dynamic = "force-dynamic";

type PedidoResumo = Pick<
  Database["public"]["Views"]["pedidos_cliente"]["Row"],
  "id" | "id_venda" | "data" | "status_pedido" | "valor_pedido" | "codigo_retirada"
>;

// Mesma regra de "pago" da página do pedido (/pedido/[id]): o código só
// aparece depois do pagamento aprovado. Não existe status "Entregue" — a
// entrega é marcada por item (`linha_itens_cliente.entregue`).
const STATUS_PAGO = ["Pagamento Realizado", "Em Separação", "Enviado"];

// Listagem "Meus Pedidos" do comprador (PRD 009 US00), que é também a aba
// Pedidos da tab bar. Change mobile-vitrine-densa-benchmark: código de
// entrega à vista no topo e "Comprar de novo" em cada pedido.
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
  let linhasEmAberto: { pedido_id: string | null; entregue: boolean | null; retirar_na_loja: boolean | null }[] = [];
  try {
    ({ data: pedidos } = await supabase
      .from("pedidos_cliente")
      .select("id, id_venda, data, status_pedido, valor_pedido, codigo_retirada")
      .order("data", { ascending: false }));

    const idsPagos = (pedidos ?? [])
      .filter((p) => p.id && p.codigo_retirada && STATUS_PAGO.includes(p.status_pedido ?? ""))
      .map((p) => p.id as string);
    if (idsPagos.length) {
      const { data } = await supabase
        .from("linha_itens_cliente")
        .select("pedido_id, entregue, retirar_na_loja")
        .in("pedido_id", idsPagos);
      linhasEmAberto = data ?? [];
    }
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

  // Pedido pago com algum item ainda não entregue = código ainda útil.
  const aguardandoEntrega = new Set(
    linhasEmAberto.filter((l) => l.entregue !== true && l.pedido_id).map((l) => l.pedido_id as string),
  );
  const soRetirada = (pedidoId: string) => {
    const doPedido = linhasEmAberto.filter((l) => l.pedido_id === pedidoId);
    return doPedido.length > 0 && doPedido.every((l) => l.retirar_na_loja);
  };
  const comCodigo = (pedidos ?? []).filter((p) => p.id && aguardandoEntrega.has(p.id));

  return (
    <Shell>
      <h1 className="font-display text-2xl font-semibold tracking-[-0.015em] text-ink">Meus Pedidos</h1>

      {comCodigo.length > 0 && (
        <section
          id="codigo-entrega"
          aria-labelledby="titulo-codigo-entrega"
          className="mt-4 scroll-mt-24 rounded-[12px] border border-lm-azul/20 bg-lm-azul/5 p-4"
        >
          <h2 id="titulo-codigo-entrega" className="text-[13px] font-semibold text-lm-marinho">
            {comCodigo.length > 1 ? "Seus códigos de entrega" : "Seu código de entrega"}
          </h2>
          <ul className="mt-2 space-y-2">
            {comCodigo.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3">
                <span className="text-[13px] text-ink-2">
                  Pedido <span className="num">{p.id_venda}</span>
                  {soRetirada(p.id as string) ? " · retirada na loja" : ""}
                </span>
                <span className="num text-2xl font-bold tracking-[.3em] text-ink">{p.codigo_retirada}</span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[12px] leading-snug text-muted">
            Mostre ao entregador, ou na loja se for retirar. O código confirma que o pedido chegou a você.
          </p>
        </section>
      )}

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
            <li key={p.id} className="rounded-[10px] border border-line bg-white">
              <Link
                href={`/pedido/${p.id}`}
                className="flex items-center justify-between gap-3 rounded-t-[10px] p-4 hover:bg-lm-cinza/40"
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
              {/* Pedido ainda aguardando pagamento se paga, não se recompra. */}
              {p.id && p.status_pedido !== "Aguardando Pagamento" && (
                <div className="border-t border-line px-4 py-2">
                  <BotaoComprarDeNovo pedidoId={p.id} />
                </div>
              )}
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
