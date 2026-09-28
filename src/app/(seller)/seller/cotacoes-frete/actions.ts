"use server";

// Resposta do seller ao pedido de cotação de frete (PRD 050, 0203). A RPC
// responder_cotacao_frete confere dono, prazo de 24 h, valor, prazo e a
// confirmação de frete acima de 50% do valor dos produtos.

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient, isServiceConfigured } from "@/lib/supabase/service";
import { avisarComprador } from "@/lib/catalogo-compra/avisos-cotacao-frete";

export type RespostaState = {
  ok: boolean;
  error?: string;
  pedirConfirmacao?: boolean;
  // Devolve o que foi digitado: a action reseta o formulário, e o seller
  // não deve redigitar tudo só para marcar a confirmação.
  valores?: Record<string, string>;
};

function reais(bruto: FormDataEntryValue | null): number | null {
  const texto = String(bruto ?? "").trim().replace(/\./g, "").replace(",", ".");
  if (!texto) return null;
  const n = Number(texto);
  return Number.isFinite(n) ? n : NaN;
}

export async function responderCotacao(_prev: RespostaState, formData: FormData): Promise<RespostaState> {
  const id = String(formData.get("id") ?? "");
  const recusar = formData.get("acao") === "recusar";
  const valor = reais(formData.get("valor"));
  const valorCarrinho = reais(formData.get("valor_carrinho"));
  const prazoMin = Number(formData.get("prazo_min"));
  const prazoMax = Number(formData.get("prazo_max"));
  const valores = Object.fromEntries(
    ["valor", "valor_carrinho", "prazo_min", "prazo_max"].map((k) => [k, String(formData.get(k) ?? "")]),
  );

  if (!recusar && (valor === null || Number.isNaN(valor))) {
    return { ok: false, valores, error: "Informe o valor do frete (0 para frete grátis)." };
  }
  if (Number.isNaN(valorCarrinho)) return { ok: false, valores, error: "Valor do carrinho inteiro inválido." };

  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- RPC 0203 fora dos tipos gerados
  const { error } = await (supabase as any).rpc("responder_cotacao_frete", {
    p_id: id,
    p_recusar: recusar,
    p_valor: recusar ? null : valor,
    p_prazo_min: recusar ? null : prazoMin,
    p_prazo_max: recusar ? null : prazoMax,
    p_valor_carrinho: recusar ? null : valorCarrinho,
    p_confirmado: formData.get("confirmado") === "on",
  });
  if (error) {
    if (error.message.includes("CONFIRMAR_FRETE_ALTO")) {
      return {
        ok: false,
        valores,
        pedirConfirmacao: true,
        error: "O frete passa de 50% do valor dos produtos. Confira o valor e marque a confirmação.",
      };
    }
    return { ok: false, valores, error: error.message };
  }

  if (isServiceConfigured) await avisarComprador(createServiceClient(), id);
  revalidatePath("/seller/cotacoes-frete");
  revalidatePath(`/seller/cotacoes-frete/${id}`);
  return { ok: true };
}
