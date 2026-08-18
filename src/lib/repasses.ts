import * as Sentry from "@sentry/nextjs";
import { createServiceClient, isServiceConfigured } from "@/lib/supabase/service";
import { createPixTransfer, isAsaasConfigured } from "@/lib/asaas";

// Tabela/RPCs das migrations 0111/0129 ainda fora de database.types.ts
// (mesmo motivo do webhook Asaas — ver comentário em api/asaas/webhook/route.ts).
type ServiceClientSemTipos = ReturnType<typeof createServiceClient> & {
  rpc(fn: string, args: Record<string, unknown>): Promise<{ data?: boolean | null; error: { message: string } | null }>;
};
type Repasse = {
  id: string;
  pedido_id: string;
  destino: "seller" | "afiliado";
  loja_id: string | null;
  afiliado_id: string | null;
  valor: number;
};
type ChavePix = {
  chave_pix: string | null;
  tipo_chave_pix: "CPF" | "CNPJ" | "EMAIL" | "PHONE" | null;
};

// Dispara o repasse automático (seller + afiliado, 0111/0129) na confirmação
// de entrega. Best-effort: chamado depois que a entrega já foi confirmada,
// uma falha aqui não pode desfazer a confirmação — ela vira 'falhou' no
// ledger para o admin tratar em /admin/repasses.
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
    .select("id, pedido_id, destino, loja_id, afiliado_id, valor")
    .eq("pedido_id", pedidoId)
    .eq("status", "pendente");

  for (const r of pendentes ?? []) {
    if (r.destino === "seller" && r.loja_id) {
      await transferirRepasse(svc, r, {
        rpcElegivel: "chave_pix_elegivel_repasse",
        rpcArg: { p_loja_id: r.loja_id },
        tabelaChave: "lojas",
        colunaId: "id",
        idChave: r.loja_id,
        signal: "transferencia_pix_seller",
      });
    } else if (r.destino === "afiliado" && r.afiliado_id) {
      await transferirRepasse(svc, r, {
        rpcElegivel: "chave_pix_elegivel_repasse_afiliado",
        rpcArg: { p_afiliado_id: r.afiliado_id },
        tabelaChave: "afiliado_dados_pix",
        colunaId: "afiliado_id",
        idChave: r.afiliado_id,
        signal: "transferencia_pix_afiliado",
      });
    }
  }
}

async function transferirRepasse(
  svc: ServiceClientSemTipos,
  r: Repasse,
  opts: {
    rpcElegivel: "chave_pix_elegivel_repasse" | "chave_pix_elegivel_repasse_afiliado";
    rpcArg: Record<string, string>;
    tabelaChave: "lojas" | "afiliado_dados_pix";
    colunaId: string;
    idChave: string;
    signal: string;
  },
): Promise<void> {
  const repasses = svc as unknown as {
    from(t: "repasses"): {
      update(v: Record<string, unknown>): { eq(c: string, v: string): Promise<unknown> };
    };
  };
  const tabelaChave = svc as unknown as {
    from(t: string): {
      select(c: string): { eq(c: string, v: string): { maybeSingle(): Promise<{ data: ChavePix | null }> } };
    };
  };
  const linhaItens = svc as unknown as {
    from(t: "linha_itens"): {
      update(v: Record<string, unknown>): { eq(c: string, v: string): Promise<unknown> };
    };
  };

  try {
    const { data: elegivel } = await svc.rpc(opts.rpcElegivel, opts.rpcArg);
    if (!elegivel) {
      await repasses.from("repasses").update({ status: "inelegivel" }).eq("id", r.id);
      return;
    }

    const { data: chave } = await tabelaChave
      .from(opts.tabelaChave)
      .select("chave_pix, tipo_chave_pix")
      .eq(opts.colunaId, opts.idChave)
      .maybeSingle();
    if (!chave?.chave_pix || !chave.tipo_chave_pix) {
      await repasses.from("repasses").update({ status: "inelegivel" }).eq("id", r.id);
      return;
    }

    await createPixTransfer({
      value: r.valor,
      pixAddressKey: chave.chave_pix,
      pixAddressKeyType: chave.tipo_chave_pix,
      description: `Repasse Indústria 24h — pedido ${r.pedido_id}`,
      externalReference: r.id,
    });

    await repasses
      .from("repasses")
      .update({ status: "transferido", transferido_em: new Date().toISOString() })
      .eq("id", r.id);
    if (r.destino === "seller") {
      await linhaItens.from("linha_itens").update({ transferido: true }).eq("pedido_id", r.pedido_id);
    }
  } catch (erro) {
    await repasses.from("repasses").update({ status: "falhou" }).eq("id", r.id);
    Sentry.captureException(erro, {
      tags: { area: "repasses", signal: opts.signal },
      extra: { repasseId: r.id, destino: r.destino, idChave: opts.idChave },
    });
  }
}
