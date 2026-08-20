import * as Sentry from "@sentry/nextjs";
import { createServiceClient } from "@/lib/supabase/service";
import { enviarBubblewhats, mensagemSaiuParaEntrega } from "@/lib/bubblewhats";
import { normalizeWhatsapp } from "@/lib/whatsapp";

// Aviso "saiu para entrega": best-effort, nunca deve impedir a transição de
// status já persistida em corridas/rotas. Usa service role — telefone do
// comprador não é dado que a RLS libera para quem está entregando (parceiro/
// afiliado), mesmo padrão de dispararRepasseAutomatico em src/lib/repasses.ts.
export async function avisarSaiuParaEntrega(pedidoId: string) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- pedidos fora de database.types.ts nesta consulta pontual
    const svc = createServiceClient() as any;
    const { data: pedido } = await svc
      .from("pedidos")
      .select("id_venda, telefone_contato")
      .eq("id", pedidoId)
      .maybeSingle();
    if (pedido?.telefone_contato) {
      await enviarBubblewhats(
        normalizeWhatsapp(pedido.telefone_contato),
        mensagemSaiuParaEntrega({
          idVenda: pedido.id_venda,
          linkPedido: `https://industria24.com.br/pedido/${pedidoId}`,
        })
      );
    }
  } catch (erro) {
    Sentry.captureException(erro, {
      tags: { area: "logistica", gateway: "bubblewhats", signal: "aviso_saiu_entrega" },
      extra: { pedidoId },
    });
  }
}
