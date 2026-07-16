// Processa os repasses PIX de um pedido pago (migration 0058). Usado pelo
// webhook Asaas (tempo real, D-E4.4) e pela ação de re-tentativa do admin.
// Fluxo: calcular_repasses_pedido insere o ledger (idempotente); cada linha
// 'pendente' vira uma transferência PIX real; sucesso/erro fica gravado no
// próprio repasse. Nunca lança — falha de repasse não pode derrubar o webhook
// (o pagamento já foi confirmado); erros vão pro Sentry e pro campo `erro`.

import * as Sentry from "@sentry/nextjs";
import { createPixTransfer, isAsaasConfigured } from "@/lib/asaas";
import type { createServiceClient } from "@/lib/supabase/service";

type ServiceClient = ReturnType<typeof createServiceClient>;

// Tipos manuais: repasses/RPCs da 0058 ainda fora de database.types.ts
// (mesma limitação documentada no webhook — regenerar tipos requer a conta certa).
export type Repasse = {
  id: string;
  pedido_id: string;
  destino: "seller" | "afiliado";
  chave_pix: string | null;
  tipo_chave_pix: "CPF" | "CNPJ" | "EMAIL" | "PHONE" | null;
  valor: number;
  status: "pendente" | "transferido" | "falhou" | "inelegivel";
};

type RpcResult<T> = { data: T | null; error: { message: string } | null };
interface SvcSemTipos {
  rpc(fn: string, args: Record<string, unknown>): Promise<RpcResult<unknown>>;
  from(table: string): {
    update(vals: Record<string, unknown>): {
      eq(col: string, val: unknown): Promise<{ error: { message: string } | null }>;
    };
  };
}

async function transferirRepasse(svc: SvcSemTipos, repasse: Repasse): Promise<void> {
  if (!repasse.chave_pix || !repasse.tipo_chave_pix) return; // inelegível já marcado no banco
  try {
    const transfer = await createPixTransfer({
      value: repasse.valor,
      pixAddressKey: repasse.chave_pix,
      pixAddressKeyType: repasse.tipo_chave_pix,
      description: `Repasse Industria24h pedido ${repasse.pedido_id} (${repasse.destino})`,
      repasseId: repasse.id,
    });
    await svc.from("repasses").update({
      status: "transferido",
      asaas_transfer_id: transfer.id,
      transferido_em: new Date().toISOString(),
      erro: null,
    }).eq("id", repasse.id);
  } catch (erro) {
    const msg = erro instanceof Error ? erro.message : String(erro);
    await svc.from("repasses").update({ status: "falhou", erro: msg }).eq("id", repasse.id);
    Sentry.captureException(erro, {
      tags: { area: "financeiro", gateway: "asaas", signal: "repasse_pix_falhou" },
      extra: { repasseId: repasse.id, pedidoId: repasse.pedido_id, destino: repasse.destino },
    });
  }
}

// Calcula (idempotente) e transfere os repasses pendentes do pedido.
export async function processarRepassesPedido(svc: ServiceClient, pedidoId: string): Promise<void> {
  if (!isAsaasConfigured) return; // regra 1: sem chave, nenhuma transferência simulada
  const untyped = svc as unknown as SvcSemTipos;

  const { data, error } = await untyped.rpc("calcular_repasses_pedido", {
    p_pedido_id: pedidoId,
  });
  if (error) throw new Error(`repasses não calculados: ${error.message}`);

  const pendentes = ((data ?? []) as Repasse[]).filter((r) => r.status === "pendente");
  for (const repasse of pendentes) {
    await transferirRepasse(untyped, repasse);
  }
}

// Re-tentativa do admin para um repasse falhou/inelegivel: revalida a
// elegibilidade (re-snapshot da chave) e, se voltou a 'pendente', transfere.
export async function retentarRepasse(svc: ServiceClient, repasseId: string): Promise<Repasse> {
  const untyped = svc as unknown as SvcSemTipos;
  const { data, error } = await untyped.rpc("revalidar_repasse", { p_repasse_id: repasseId });
  if (error) throw new Error(error.message);
  const repasse = data as Repasse;
  if (repasse.status === "pendente" && isAsaasConfigured) {
    await transferirRepasse(untyped, repasse);
  }
  return repasse;
}
