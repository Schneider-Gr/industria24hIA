"use server";

import * as Sentry from "@sentry/nextjs";
import { createPublicClient } from "@/lib/supabase/public";
import { dispararRepasseAutomaticoPorIdVenda } from "@/lib/repasses";

// RPC da migration 0112 ainda fora de database.types.ts.
type PublicClientSemTipos = ReturnType<typeof createPublicClient> & {
  rpc(
    fn: "pedido_confirmar_entrega_publico",
    args: { p_id_venda: string; p_codigo: string; p_nome_entregador: string },
  ): Promise<{ data: number | null; error: { message: string } | null }>;
};

export type ConfirmarEntregaPublicaState = {
  ok: boolean;
  erro?: string;
  mensagem?: string;
};

// Confirmação de entrega sem login (0112) — transportador terceiro sem
// conta na plataforma. Best-effort no repasse: a entrega já fica confirmada
// mesmo se a transferência falhar (vira 'falhou' no ledger do admin).
export async function confirmarEntregaPublica(
  _prev: ConfirmarEntregaPublicaState,
  formData: FormData,
): Promise<ConfirmarEntregaPublicaState> {
  const idVenda = String(formData.get("id_venda") ?? "").trim();
  const codigo = String(formData.get("codigo") ?? "").trim();
  const nome = String(formData.get("nome_entregador") ?? "").trim();

  if (!idVenda) return { ok: false, erro: "Informe o número do pedido." };
  if (!codigo) return { ok: false, erro: "Informe o código do comprador." };
  if (nome.length < 2) return { ok: false, erro: "Informe seu nome." };

  const supabase = createPublicClient() as unknown as PublicClientSemTipos;
  const { data, error } = await supabase.rpc("pedido_confirmar_entrega_publico", {
    p_id_venda: idVenda,
    p_codigo: codigo,
    p_nome_entregador: nome,
  });

  if (error) return { ok: false, erro: error.message };
  if (data === -1) return { ok: false, erro: "Código do comprador incorreto." };
  if (data === 0) return { ok: true, mensagem: "Este pedido já estava confirmado como entregue." };

  try {
    await dispararRepasseAutomaticoPorIdVenda(idVenda);
  } catch (erro) {
    Sentry.captureException(erro, {
      tags: { area: "repasses", signal: "disparo_pos_entrega_publica" },
      extra: { idVenda },
    });
  }

  return { ok: true, mensagem: "Entrega confirmada. Obrigado!" };
}
