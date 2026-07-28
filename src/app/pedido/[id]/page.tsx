import Link from "next/link";
import { notFound } from "next/navigation";
import * as Sentry from "@sentry/nextjs";
import { VitrineHeader, VitrineFooter } from "@/components/vitrine/ui";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { ErrorState } from "@/components/ErrorState";
import { formatBRL } from "@/components/seller/format";
import { getPixQrCode, isAsaasConfigured } from "@/lib/asaas";
import { gerarCobranca } from "@/app/checkout/actions";
import { LimparCarrinhoAoMontar } from "./limpar";

export const dynamic = "force-dynamic";

// Página do pedido do comprador: status, itens, frete e pagamento
// (QR PIX inline; boleto/cartão via link da fatura Asaas).
export default async function PedidoPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ novo?: string }>;
}) {
  if (!isSupabaseConfigured) {
    return <ErrorState title="Supabase não configurado" />;
  }
  const { id } = await params;
  const { novo } = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return (
      <Shell novo={false}>
        <ErrorState
          title="Faça login"
          detail="Entre com a conta usada na compra para ver este pedido."
        />
        <p className="mt-3 text-center">
          <Link href={`/login?next=/pedido/${id}`} className="text-aco-600 underline">
            Ir para o login
          </Link>
        </p>
      </Shell>
    );
  }

  // view: cliente vê só colunas de consumo do próprio pedido (0025)
  const { data: pedido } = await supabase
    .from("pedidos_cliente")
    .select(
      "id, id_venda, data, status_pedido, valor_pedido, forma_pagamento, link_cobranca, asaas_cobranca_id, codigo_retirada",
    )
    .eq("id", id)
    .maybeSingle();
  if (!pedido) notFound();

  const { data: itens } = await supabase
    .from("linha_itens_cliente")
    .select(
      "id, produto_nome, quantidade, valor, valor_frete, retirar_na_loja, entrega_rua, entrega_numero, entrega_bairro, entrega_cidade, entrega_cep",
    )
    .eq("pedido_id", id);

  const pago = pedido.status_pedido === "Pagamento Realizado";
  const freteTotal = (itens ?? []).reduce((s, i) => s + Number(i.valor_frete ?? 0), 0);
  const retirada = (itens ?? []).every((i) => i.retirar_na_loja);
  const end = (itens ?? []).find((i) => !i.retirar_na_loja);

  // QR PIX ao vivo (só se cobrança existe, é PIX e ainda não pagou)
  let pix: { encodedImage: string; payload: string } | null = null;
  if (!pago && pedido.asaas_cobranca_id && pedido.forma_pagamento === "PIX" && isAsaasConfigured) {
    try {
      pix = await getPixQrCode(pedido.asaas_cobranca_id);
    } catch (erro) {
      // QR indisponível: o link da fatura abaixo continua servindo
      Sentry.captureMessage(erro instanceof Error ? erro.message : "Falha ao buscar QR PIX", {
        level: "warning",
        tags: { area: "pix_qr", gateway: "asaas" },
      });
    }
  }

  return (
    <Shell novo={novo === "1"}>
      <div className="rounded border border-line bg-white p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-bold text-ink">
              Pedido <span className="num">{pedido.id_venda}</span>
            </h1>
            <p className="text-sm text-muted">
              {pedido.data ? new Date(pedido.data).toLocaleDateString("pt-BR") : "—"} ·{" "}
              {retirada ? "Retirada na loja" : "Entrega"}
            </p>
          </div>
          <span
            className={`rounded px-3 py-1 text-sm font-semibold ${pago ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}`}
          >
            {pedido.status_pedido}
          </span>
        </div>

        <table className="mt-4 w-full text-sm">
          <tbody>
            {(itens ?? []).map((i) => (
              <tr key={i.id} className="border-t border-line">
                <td className="py-2">
                  {i.quantidade}× {i.produto_nome ?? "—"}
                </td>
                <td className="num py-2 text-right">{formatBRL(i.valor)}</td>
              </tr>
            ))}
            {freteTotal > 0 && (
              <tr className="border-t border-line">
                <td className="py-2">Frete</td>
                <td className="num py-2 text-right">{formatBRL(freteTotal)}</td>
              </tr>
            )}
            <tr className="border-t border-line text-base font-bold">
              <td className="py-2">Total</td>
              <td className="num py-2 text-right">{formatBRL(pedido.valor_pedido)}</td>
            </tr>
          </tbody>
        </table>

        {end && (
          <p className="mt-2 text-sm text-muted">
            Entrega: {end.entrega_rua}, {end.entrega_numero} — {end.entrega_bairro},{" "}
            {end.entrega_cidade} · CEP {end.entrega_cep}
          </p>
        )}

        {pago && pedido.codigo_retirada && (
          <div className="mt-4 rounded border border-verde-24h bg-verde-24h-tint p-4 text-center">
            <p className="text-xs font-semibold uppercase tracking-[.12em] text-verde-24h">
              {retirada ? "Código de retirada" : "Código de entrega"}
            </p>
            <p className="num mt-1 text-3xl font-bold tracking-[.3em] text-ink">
              {pedido.codigo_retirada}
            </p>
            <p className="mt-1 text-xs text-muted">
              Apresente este código {retirada ? "na loja ao retirar" : "ao entregador"} —
              ele confirma que o pedido chegou à pessoa certa.
            </p>
          </div>
        )}
      </div>

      {!pago && (
        <div className="mt-6 rounded border border-line bg-white p-6">
          <h2 className="font-display text-lg font-semibold text-ink">Pagamento</h2>

          {pix && (
            <div className="mt-3 flex flex-col items-center gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`data:image/png;base64,${pix.encodedImage}`}
                alt="QR Code PIX"
                className="h-52 w-52"
              />
              <p className="max-w-full break-all rounded bg-surface p-2 text-[11px] text-muted">
                {pix.payload}
              </p>
              <p className="text-sm text-muted">
                Escaneie o QR ou copie o código PIX acima. A confirmação é automática.
              </p>
            </div>
          )}

          {pedido.link_cobranca && (
            <p className="mt-3 text-center">
              <a
                href={pedido.link_cobranca}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex rounded bg-sinal px-6 py-3 text-base font-semibold text-white hover:bg-sinal-escuro"
              >
                {pedido.forma_pagamento === "PIX" ? "Abrir fatura" : "Pagar agora"}
              </a>
            </p>
          )}

          {!pedido.asaas_cobranca_id &&
            (isAsaasConfigured ? (
              <form action={gerarCobranca} className="mt-3 grid grid-cols-2 gap-3">
                <input type="hidden" name="pedido_id" value={pedido.id ?? ""} />
                <input
                  name="nome"
                  required
                  placeholder="Nome completo"
                  className="rounded border border-line px-3 py-2 text-sm"
                />
                <input
                  name="cpf_cnpj"
                  required
                  placeholder="CPF/CNPJ"
                  className="rounded border border-line px-3 py-2 text-sm"
                />
                <button
                  type="submit"
                  className="col-span-2 rounded bg-sinal px-5 py-2.5 text-sm font-semibold text-white hover:bg-sinal-escuro"
                >
                  Gerar cobrança
                </button>
              </form>
            ) : (
              <p className="mt-3 rounded border border-warn bg-warn/10 p-3 text-sm">
                Pagamento online ainda não configurado nesta instalação
                (ASAAS_API_KEY pendente). Seu pedido foi registrado — combine o
                pagamento com a loja.
              </p>
            ))}
        </div>
      )}

      <p className="mt-6 text-center text-sm">
        <Link href="/" className="text-aco-600 underline underline-offset-2">
          Continuar comprando
        </Link>
      </p>
    </Shell>
  );
}

function Shell({ children, novo }: { children: React.ReactNode; novo: boolean }) {
  return (
    <div className="flex min-h-screen flex-col bg-[#FAFAF9]">
      <VitrineHeader />
      {novo && <LimparCarrinhoAoMontar />}
      <main className="mx-auto w-full max-w-[700px] flex-1 px-4 py-8">{children}</main>
      <VitrineFooter />
    </div>
  );
}
