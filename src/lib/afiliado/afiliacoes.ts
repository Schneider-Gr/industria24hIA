// Acesso à tabela `afiliacoes` (RLS 0002/0010/0014). Existe porque o shape da
// linha de afiliação estava replicado em três inserts — produto, lote e loja —
// e a comissão padrão vivia hardcoded em dois deles, com o risco de divergirem
// (foi assim que a comissão já foi parar no afiliado errado).
//
// Regra escondida aqui: um UPDATE que afeta zero linhas não é sucesso, é a RLS
// barrando uma afiliação de outra loja. Só o seller tratava isso; o admin não.

import { createClient } from "@/lib/supabase/server";

// Comissão quando o produto não define a sua (o default do CHECK de 0002).
export const PORCENTAGEM_AFILIADO_PADRAO = 5;

export const STATUS_MODERACAO = ["Aprovada", "Suspensa"] as const;
export type StatusModeracao = (typeof STATUS_MODERACAO)[number];

export function isStatusModeracao(valor: string): valor is StatusModeracao {
  return (STATUS_MODERACAO as readonly string[]).includes(valor);
}

export type TipoAfiliacao = "vendas" | "logistica";

export type NovaAfiliacao = {
  afiliadoId: string;
  produtoId?: string | null;
  lojaId: string | null;
  tipo: TipoAfiliacao;
  porcentagem?: number | null;
  identificador: string;
  termosVersao: string | null;
  agora?: string;
};

export type LinhaAfiliacao = {
  afiliado_id: string;
  produto_id?: string | null;
  loja_id: string | null;
  porcentagem: number;
  tipo: TipoAfiliacao;
  status: "Pendente";
  identificador: string;
  termos_aceitos_em: string;
  termos_versao: string | null;
};

// Monta a linha de afiliação. Pura para ter check em afiliacoes.test.ts — é
// aqui que a comissão padrão e o status inicial ficam definidos uma vez só.
export function montarLinhaAfiliacao(nova: NovaAfiliacao): LinhaAfiliacao {
  const linha: LinhaAfiliacao = {
    afiliado_id: nova.afiliadoId,
    loja_id: nova.lojaId,
    porcentagem: nova.porcentagem ?? PORCENTAGEM_AFILIADO_PADRAO,
    tipo: nova.tipo,
    status: "Pendente",
    identificador: nova.identificador,
    termos_aceitos_em: nova.agora ?? new Date().toISOString(),
    termos_versao: nova.termosVersao,
  };
  if (nova.produtoId !== undefined) linha.produto_id = nova.produtoId;
  return linha;
}

// Cria uma ou mais afiliações. Lança com a mensagem do banco, como os call
// sites originais faziam.
export async function criarAfiliacoes(novas: NovaAfiliacao[]): Promise<void> {
  if (novas.length === 0) return;
  const supabase = await createClient();
  const { error } = await supabase.from("afiliacoes").insert(novas.map(montarLinhaAfiliacao));
  if (error) throw new Error(`Erro ao solicitar afiliação: ${error.message}`);
}

// Moderação (aprovar/suspender). Zero linhas = a RLS barrou: a afiliação não é
// da loja de quem chamou, ou não existe.
export async function definirStatusAfiliacao(id: string, status: StatusModeracao): Promise<void> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("afiliacoes")
    .update({ status })
    .eq("id", id)
    .select("id");

  if (error) throw new Error(error.message);
  if (!data || data.length === 0) {
    throw new Error("Afiliação não encontrada no seu escopo.");
  }
}
