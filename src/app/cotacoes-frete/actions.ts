"use server";

// Pedido de cotação de frete pelo comprador (PRD 050, 0203). A RPC
// solicitar_cotacao_frete valida tudo o que protege o sistema (login, dono,
// produto marcado, flag da loja, contato na observação, 10 por hora, faixa de
// CEP do produto); aqui fica a regra da UF de origem, que precisa do ViaCEP,
// e o aviso ao seller.
//
// O estado é lido no client (estadoEntregaACombinar), nunca no Server
// Component da página do produto: ela é pública e cacheada, e a cotação de um
// comprador não pode aparecer para outro (mesmo racional de
// BotaoFalarComVendedor).

import * as Sentry from "@sentry/nextjs";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient, isServiceConfigured } from "@/lib/supabase/service";
import { buscarEndereco, limparCep } from "@/lib/cep";
import { checarLimite } from "@/lib/rate-limit";
import {
  MSG_OBSERVACAO_CONTATO,
  exibirEntregaACombinar,
  observacaoTemContato,
  statusEfetivo,
  type DecisaoPdp,
} from "@/lib/catalogo-compra/cotacao-frete";
import { avisarSellerNovaCotacao } from "@/lib/catalogo-compra/avisos-cotacao-frete";

export type PedidoCotacaoState = { ok: boolean; error?: string };

export type CotacaoResumo = {
  id: string;
  status: string;
  quantidade: number;
  valor_centavos: number | null;
  prazo_min: number | null;
  prazo_max: number | null;
  valida_ate: string | null;
  responder_ate: string;
};

type Item = { produto_id: string; quantidade: number };
type SupabaseServer = Awaited<ReturnType<typeof createClient>>;

function lerItens(bruto: FormDataEntryValue | null): Item[] | null {
  try {
    const itens = JSON.parse(String(bruto ?? "[]")) as Item[];
    if (!Array.isArray(itens)) return null;
    return itens
      .map((i) => ({ produto_id: String(i.produto_id), quantidade: Math.floor(Number(i.quantidade)) }))
      .filter((i) => i.produto_id && i.quantidade > 0);
  } catch {
    return null;
  }
}

/** Região do produto: faixa declarada, senão a UF do CEP de origem. */
async function decidirRegiao(
  supabase: SupabaseServer,
  produtoId: string,
  cep: string,
): Promise<{ decisao: DecisaoPdp; origem: string | null; destino: Awaited<ReturnType<typeof buscarEndereco>> }> {
  // `lojas` não tem leitura pública (0012): flag, cidade/UF da loja e faixa
  // vêm da função entrega_a_combinar_info (0203), que não expõe CEP nem contato.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- RPC 0203 fora dos tipos gerados
  const { data: infoRows } = await (supabase as any).rpc("entrega_a_combinar_info", {
    p_produto_id: produtoId,
    p_cep: cep || null,
  });
  const info = ((infoRows as {
    ativo: boolean;
    loja_cidade: string | null;
    loja_uf: string | null;
    tem_faixas: boolean;
    cep_na_faixa: boolean;
  }[] | null) ?? [])[0];
  const { data: produto } = await supabase.from("produtos").select("cep_produto").eq("id", produtoId).maybeSingle();
  const cepOrigem = limparCep(produto?.cep_produto ?? "");
  const origemCep = cepOrigem.length >= 7 ? await buscarEndereco(cepOrigem.padStart(8, "0")) : null;
  const origemCidade = origemCep?.cidade || info?.loja_cidade || null;
  const origemUf = origemCep?.uf || info?.loja_uf || null;
  const origem = origemCidade ? `${origemCidade}${origemUf ? `, ${origemUf}` : ""}` : null;

  const destino = cep.length === 8 ? await buscarEndereco(cep) : null;
  const decisao = exibirEntregaACombinar({
    lojaFlag: info?.ativo === true,
    produtoFlag: info?.ativo === true,
    temFaixas: info?.tem_faixas === true,
    cepNaFaixa: info?.cep_na_faixa === true,
    ufDestino: destino?.uf ?? null,
    ufOrigem: origemUf,
  });
  return { decisao, origem, destino };
}

export async function estadoEntregaACombinar(
  produtoId: string,
  cepBruto: string | null,
): Promise<{ logado: boolean; decisao: DecisaoPdp | "sem_cep"; origem: string | null; cotacao: CotacaoResumo | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const cep = limparCep(cepBruto ?? "");
  if (cep.length !== 8) {
    const { decisao, origem } = await decidirRegiao(supabase, produtoId, "");
    return { logado: !!user, decisao: decisao === "nao_se_aplica" ? decisao : "sem_cep", origem, cotacao: null };
  }
  const { decisao, origem } = await decidirRegiao(supabase, produtoId, cep);
  if (!user) return { logado: false, decisao, origem, cotacao: null };

  const { data } = await supabase
    .from("cotacoes_frete_vendedor")
    .select("id, status, itens, valor_centavos, prazo_min, prazo_max, valida_ate, responder_ate")
    .eq("comprador_id", user.id)
    .eq("produto_id", produtoId)
    .eq("cep_destino", cep)
    .not("status", "in", "(substituida,cancelada)")
    .order("criado_em", { ascending: false })
    .limit(1)
    .maybeSingle();
  const cotacao = data
    ? {
        id: data.id,
        status: statusEfetivo(data),
        quantidade: ((data.itens as Item[])?.[0]?.quantidade ?? 0),
        valor_centavos: data.valor_centavos,
        prazo_min: data.prazo_min,
        prazo_max: data.prazo_max,
        valida_ate: data.valida_ate,
        responder_ate: data.responder_ate,
      }
    : null;
  return { logado: true, decisao, origem, cotacao };
}

export async function pedirCotacaoFrete(_prev: PedidoCotacaoState, formData: FormData): Promise<PedidoCotacaoState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Faça login para pedir a cotação." };
  if (!checarLimite(`cotacao-frete:${user.id}`, 5, 60_000)) {
    return { ok: false, error: "Muitas tentativas seguidas. Aguarde um minuto." };
  }

  const itens = lerItens(formData.get("itens"));
  const itensCarrinho = lerItens(formData.get("itens_carrinho")) ?? [];
  const cep = limparCep(String(formData.get("cep") ?? ""));
  const observacao = String(formData.get("observacao") ?? "").trim();
  const telefone = String(formData.get("telefone") ?? "").replace(/\D/g, "");
  const produtoId = String(formData.get("produto_id") ?? "") || null;
  if (!itens?.length) return { ok: false, error: "Informe a quantidade." };
  if (cep.length !== 8) return { ok: false, error: "Informe um CEP válido." };
  if (observacao.length > 500) return { ok: false, error: "A observação passa de 500 caracteres." };
  if (observacaoTemContato(observacao)) return { ok: false, error: MSG_OBSERVACAO_CONTATO };

  // Todos os itens de um pedido de cotação saem da mesma origem; basta o 1º.
  const { decisao, destino } = await decidirRegiao(supabase, itens[0].produto_id, cep);
  if (!destino) return { ok: false, error: "Não encontramos esse CEP." };
  if (decisao === "fora_da_regiao") return { ok: false, error: "Não entregamos na sua região." };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- RPC 0203 fora dos tipos gerados
  const { data: id, error } = await (supabase as any).rpc("solicitar_cotacao_frete", {
    p_itens: itens,
    p_cep: cep,
    p_observacao: observacao || null,
    p_itens_carrinho: itensCarrinho.length ? itensCarrinho : null,
    p_produto_id: produtoId,
    p_bairro: destino.bairro || null,
    p_cidade: destino.cidade || null,
    p_uf: destino.uf || null,
    p_telefone: telefone || null,
  });
  if (error || !id) return { ok: false, error: error?.message ?? "Não foi possível pedir a cotação." };

  if (isServiceConfigured) {
    await avisarSellerNovaCotacao(createServiceClient(), id as string);
  } else {
    Sentry.captureMessage("Cotação de frete sem service role: seller não avisado", { level: "warning" });
  }
  return { ok: true };
}

export async function cancelarCotacaoFrete(id: string): Promise<void> {
  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- RPC 0203 fora dos tipos gerados
  await (supabase as any).rpc("cancelar_cotacao_frete", { p_id: id });
}
