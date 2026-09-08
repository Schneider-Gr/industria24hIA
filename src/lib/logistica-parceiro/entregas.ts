// Acesso à tabela `entregas` (fonte única do fulfillment, migrations 0009/0014)
// e à RPC de confirmação por código (0071/0090). Existe para que seller, admin,
// afiliado logístico e parceiro não repitam upsert, onConflict e a leitura do
// retorno da RPC — cada cópia era uma chance de divergir.
//
// A regra escondida aqui que mais custava: um upsert que afeta ZERO linhas não
// é sucesso, é RLS barrando o item (não é da loja/corrida de quem chamou).
// Só o seller tratava isso; admin e afiliado engoliam calados.

import { createClient } from "@/lib/supabase/server";

export const STATUS_ENTREGA = ["Pendente", "Enviado", "Entregue"] as const;
export type StatusEntrega = (typeof STATUS_ENTREGA)[number];

export function isStatusEntrega(valor: string): valor is StatusEntrega {
  return (STATUS_ENTREGA as readonly string[]).includes(valor);
}

// Grava o status de fulfillment de um item. Lança se o banco recusar ou se a
// RLS não deixar o chamador tocar o item.
export async function registrarStatusEntrega(
  linhaItemId: string,
  status: StatusEntrega,
  rastreio: string | null = null,
): Promise<void> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("entregas")
    .upsert(
      {
        linha_item_id: linhaItemId,
        status,
        rastreio,
        atualizado_em: new Date().toISOString(),
      },
      { onConflict: "linha_item_id" },
    )
    .select("linha_item_id");

  if (error) throw new Error(error.message);
  if (!data || data.length === 0) {
    throw new Error("Entrega não atualizada (item fora do seu escopo?).");
  }
}

export type ResultadoConfirmacao =
  | { resultado: "confirmado" }
  | { resultado: "ja_confirmado" }
  | { resultado: "codigo_incorreto" };

// A RPC devolve -1 para código errado e 0 para pedido já confirmado em vez de
// lançar, para não reverter o contador de tentativas. Pura para ter check em
// entregas.test.ts.
export function interpretarRetornoConfirmacao(data: number | null): ResultadoConfirmacao {
  if (data === -1) return { resultado: "codigo_incorreto" };
  if (data === 0) return { resultado: "ja_confirmado" };
  return { resultado: "confirmado" };
}

// Confirma a entrega com o código do comprador (RPC 0071).
export async function confirmarEntregaPorCodigo(
  pedidoId: string,
  codigo: string,
): Promise<ResultadoConfirmacao> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("pedido_confirmar_entrega", {
    p_pedido_id: pedidoId,
    p_codigo: codigo,
  });
  if (error) throw new Error(error.message);
  return interpretarRetornoConfirmacao(data);
}

// Foto de comprovação da entrega, no bucket `entregas`.
export async function uploadFotoEntrega(corridaId: string, foto: File): Promise<string> {
  const supabase = await createClient();
  const extensao = (foto.name.split(".").pop() || "jpg").replace(/[^\w]/g, "");
  const path = `${corridaId}/${crypto.randomUUID()}.${extensao}`;
  const { error } = await supabase.storage.from("entregas").upload(path, foto);
  if (error) throw new Error(`Falha no upload da foto: ${error.message}`);
  return supabase.storage.from("entregas").getPublicUrl(path).data.publicUrl;
}
