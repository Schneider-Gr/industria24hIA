import * as Sentry from "@sentry/nextjs";
import { createServiceClient, isServiceConfigured } from "@/lib/supabase/service";
import { createPixTransfer, isAsaasConfigured } from "@/lib/asaas";

// Tabela/RPCs da migration 0111 ainda fora de database.types.ts (mesmo
// motivo do webhook Asaas — ver comentário em api/asaas/webhook/route.ts).
type ServiceClientSemTipos = ReturnType<typeof createServiceClient> & {
  rpc(fn: string, args: Record<string, unknown>): Promise<{ error: { message: string } | null }>;
};
type Repasse = {
  id: string;
  pedido_id: string;
  destino: "seller" | "afiliado";
  loja_id: string | null;
  valor: number;
};
type LojaChavePix = {
  chave_pix: string | null;
  tipo_chave_pix: "CPF" | "CNPJ" | "EMAIL" | "PHONE" | null;
};

// Dispara o repasse automático ao seller na confirmação de entrega (0111).
// Só o destino 'seller' é transferido aqui — repasse ao afiliado segue
// manual (D-E4.1 em aberto: não existe chave PIX por afiliado no schema).
// Best-effort: chamado depois que a entrega já foi confirmada, uma falha
// aqui não pode desfazer a confirmação — ela vira 'falhou' no ledger para
// o admin tratar em /admin/repasses.
export async function dispararRepasseAutomatico(pedidoId: string): Promise<void> {
  if (!isServiceConfigured || !isAsaasConfigured) return;
  const svc = createServiceClient() as unknown as ServiceClientSemTipos;
  await dispararRepasseAutomaticoComCliente(svc, pedidoId);
}

// Variante para a via pública (0112): o entregador sem login só tem o
// id_venda legível, não o uuid do pedido. Resolve via service client
// (pedidos não é publicamente legível por id_venda — RLS restringe ao
// comprador/loja dona), então segue o mesmo fluxo de sempre.
export async function dispararRepasseAutomaticoPorIdVenda(idVenda: string): Promise<void> {
  if (!isServiceConfigured || !isAsaasConfigured) return;
  const svc = createServiceClient() as unknown as ServiceClientSemTipos;
  const { data: pedido } = await (svc as unknown as {
    from(t: "pedidos"): { select(c: string): { eq(c: string, v: string): { maybeSingle(): Promise<{ data: { id: string } | null }> } } };
  })
    .from("pedidos")
    .select("id")
    .eq("id_venda", idVenda.toUpperCase())
    .maybeSingle();
  if (!pedido?.id) return;
  await dispararRepasseAutomaticoComCliente(svc, pedido.id);
}

async function dispararRepasseAutomaticoComCliente(
  svc: ServiceClientSemTipos,
  pedidoId: string,
): Promise<void> {
  const { error: calcErro } = await svc.rpc("repasses_recalcular_pedido", { p_pedido_id: pedidoId });
  if (calcErro) throw new Error(`repasses não recalculados: ${calcErro.message}`);

  const { data: pendentes } = await (svc as unknown as {
    from(t: "repasses"): {
      select(c: string): { eq(c: string, v: string): { eq(c: string, v: string): Promise<{ data: Repasse[] | null }> } };
    };
  })
    .from("repasses")
    .select("id, pedido_id, destino, loja_id, valor")
    .eq("pedido_id", pedidoId)
    .eq("status", "pendente");

  for (const r of pendentes ?? []) {
    if (r.destino !== "seller" || !r.loja_id) continue;
    await transferirRepasseSeller(svc, r);
  }
}

async function transferirRepasseSeller(svc: ServiceClientSemTipos, r: Repasse): Promise<void> {
  const repasses = svc as unknown as {
    from(t: "repasses"): {
      update(v: Record<string, unknown>): { eq(c: string, v: string): Promise<unknown> };
    };
  };
  const lojas = svc as unknown as {
    from(t: "lojas"): {
      select(c: string): { eq(c: string, v: string): { maybeSingle(): Promise<{ data: LojaChavePix | null }> } };
    };
  };
  const linhaItens = svc as unknown as {
    from(t: "linha_itens"): {
      update(v: Record<string, unknown>): { eq(c: string, v: string): Promise<unknown> };
    };
  };

  try {
    const { data: elegivel } = await (svc as unknown as {
      rpc(fn: "chave_pix_elegivel_repasse", args: { p_loja_id: string }): Promise<{ data: boolean | null }>;
    }).rpc("chave_pix_elegivel_repasse", { p_loja_id: r.loja_id! });
    if (!elegivel) {
      await repasses.from("repasses").update({ status: "inelegivel" }).eq("id", r.id);
      return;
    }

    const { data: loja } = await lojas.from("lojas").select("chave_pix, tipo_chave_pix").eq("id", r.loja_id!).maybeSingle();
    if (!loja?.chave_pix || !loja.tipo_chave_pix) {
      await repasses.from("repasses").update({ status: "inelegivel" }).eq("id", r.id);
      return;
    }

    await createPixTransfer({
      value: r.valor,
      pixAddressKey: loja.chave_pix,
      pixAddressKeyType: loja.tipo_chave_pix,
      description: `Repasse Indústria 24h — pedido ${r.pedido_id}`,
      externalReference: r.id,
    });

    await repasses
      .from("repasses")
      .update({ status: "transferido", transferido_em: new Date().toISOString() })
      .eq("id", r.id);
    await linhaItens.from("linha_itens").update({ transferido: true }).eq("pedido_id", r.pedido_id);
  } catch (erro) {
    await repasses.from("repasses").update({ status: "falhou" }).eq("id", r.id);
    Sentry.captureException(erro, {
      tags: { area: "repasses", signal: "transferencia_pix_seller" },
      extra: { repasseId: r.id, lojaId: r.loja_id },
    });
  }
}
