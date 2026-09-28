// Cotação da entrega por parceiro local no checkout (PRD 056, US01 e US02).
// Server-only: lê produtos, afiliados e travessias com service role, pergunta a
// rota ao Google e grava a cotação que a checkout_criar_pedido confere (0207).
// Qualquer falha devolve null: a opção não aparece e as demais seguem.

import { calcularTrajeto } from "@/lib/geo";
import { enderecoParaRota } from "@/lib/cep";
import type { createServiceClient } from "@/lib/supabase/service";
import { cotarParceiroLocal, type CotacaoParceiroLocal } from "./frete-parceiro-local";
import { COLUNAS_BANDAS, NOME_CLASSE, balsaDaTravessia, bandasDasColunas, type ColunasBandas } from "./simulador-km";

// Janela de aceite do motorista somada ao prazo (PRD 053 US02).
export const JANELA_ACEITE_MIN = 60;
const VALIDADE_MIN = 30;

export type OpcaoParceiroLocal = {
  tipo: "parceiro_local";
  transportadoraId: null;
  nome: string;
  valor: number;
  balsa: number;
  prazoMin: number;
  cotacaoParceiroId: string;
};

type Svc = ReturnType<typeof createServiceClient>;
type Produto = Partial<ColunasBandas> & {
  id: string;
  loja_id: string;
  peso: number | null;
  permite_logistica_afiliado: boolean | null;
  cep_produto: string | null;
};

const soDigitos = (v: string | null | undefined) => String(v ?? "").replace(/\D/g, "");

/** Rótulo da opção: "Entrega por parceiro local (Carro)" + balsa separada. */
export function nomeOpcaoParceiroLocal(c: Extract<CotacaoParceiroLocal, { ok: true }>): string {
  const base = `Entrega por parceiro local (${NOME_CLASSE[c.classe]})`;
  if (!(c.balsa > 0)) return base;
  const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  return `${base}: entrega ${brl(Math.round((c.total - c.balsa) * 100) / 100)} + balsa ${brl(c.balsa)}`;
}

export async function cotarEntregaParceiroLocal(
  svc: Svc,
  e: {
    lojaId: string;
    compradorId: string;
    itens: { produto_id: string; quantidade: number }[];
    destino: { cep: string; rua?: string; numero?: string; bairro?: string; cidade?: string };
  },
): Promise<OpcaoParceiroLocal | null> {
  const cep = soDigitos(e.destino.cep);
  if (cep.length !== 8 || e.itens.length === 0) return null;

  // Interino até a afiliação por produto (PRD 054 M1): basta a loja ter afiliado logístico aprovado.
  const { count: afiliados } = await svc
    .from("afiliacoes")
    .select("id", { count: "exact", head: true })
    .eq("loja_id", e.lojaId)
    .eq("tipo", "logistica")
    .eq("status", "Aprovada");
  if (!afiliados) return null;

  const [{ data: prodRows }, { data: loja }] = await Promise.all([
    svc
      .from("produtos")
      .select(`id, loja_id, peso, permite_logistica_afiliado, cep_produto, ${COLUNAS_BANDAS}`)
      .in("id", e.itens.map((i) => i.produto_id)),
    svc.from("lojas").select("rua, numero, bairro, cidade, cep").eq("id", e.lojaId).maybeSingle(),
  ]);
  const produtos = new Map(((prodRows ?? []) as unknown as Produto[]).map((p) => [p.id, p]));
  if (e.itens.some((i) => produtos.get(i.produto_id)?.loja_id !== e.lojaId)) return null;

  const itens = e.itens.map((i) => {
    const p = produtos.get(i.produto_id)!;
    return {
      pesoUnitKg: p.peso == null ? null : Number(p.peso),
      quantidade: i.quantidade,
      permiteParceiro: p.permite_logistica_afiliado === true,
      bandas: bandasDasColunas(p),
    };
  });
  // Barra cedo o que não depende da rota, para não gastar consulta paga no Google.
  const previa = cotarParceiroLocal({ itens, distanciaM: 0 });
  if (!previa.ok) return null;

  // Partida = a do simulador: CEP do produto; itens com CEPs diferentes ou sem CEP → endereço da loja (PRD 056).
  const ceps = new Set(e.itens.map((i) => soDigitos(produtos.get(i.produto_id)!.cep_produto)));
  const [cepProduto] = [...ceps];
  const origem =
    ceps.size === 1 && cepProduto
      ? await enderecoParaRota(cepProduto.padStart(8, "0"))
      : [[loja?.rua, loja?.numero].filter(Boolean).join(" "), loja?.bairro, loja?.cidade, loja?.cep].filter(Boolean).join(", ");
  if (!origem) return null;
  const { rua, numero, bairro, cidade } = e.destino;
  const destino =
    rua && cidade
      ? [[rua, numero].filter(Boolean).join(", "), bairro, cidade, `${cep.slice(0, 5)}-${cep.slice(5)}`].filter(Boolean).join(", ")
      : await enderecoParaRota(cep);
  if (!destino) return null;

  const rota = await calcularTrajeto(origem, destino);
  if (!rota.ok) return null;
  const barcoM = rota.valor.barco.reduce((s, b) => s + b.metros, 0);

  let balsa;
  if (barcoM > 0) {
    // Mesma travessia padrão do simulador: a que tem "balsa" no nome, senão a primeira ativa.
    const { data: tRows } = await svc
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- tabela da 0202 fora dos tipos gerados
      .from("travessias" as any)
      .select("nome, valor_equivalente, fator_moto, fator_carro, fator_caminhao")
      .eq("ativo", true)
      .order("nome");
    type Linha = Parameters<typeof balsaDaTravessia>[0] & { nome: string };
    const linhas = (tRows ?? []) as unknown as Linha[];
    const t = linhas.find((l) => /balsa/i.test(l.nome)) ?? linhas[0];
    balsa = t ? balsaDaTravessia(t) : undefined;
  }

  const c = cotarParceiroLocal({ itens, distanciaM: rota.valor.distancia_m, barcoM, balsa });
  if (!c.ok || !(c.total > 0)) return null;

  const { data: chave, error: chaveErro } = await svc.rpc("cotacao_itens_chave" as never, { p_itens: e.itens } as never);
  if (chaveErro || typeof chave !== "string") throw new Error(`Falha na chave dos itens: ${chaveErro?.message}`);

  const { data: salva, error } = await svc
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- tabela da 0207 fora dos tipos gerados
    .from("cotacoes_parceiro_local" as any)
    .insert({
      loja_id: e.lojaId,
      comprador_id: e.compradorId,
      cep,
      itens_chave: chave,
      valor_centavos: Math.round(c.total * 100),
      classe: c.classe,
      peso_kg: c.pesoKg,
      km: c.km,
      balsa_centavos: Math.round(c.balsa * 100),
      duracao_s: rota.valor.duracao_s,
      expira_em: new Date(Date.now() + VALIDADE_MIN * 60_000).toISOString(),
    })
    .select("id")
    .single();
  if (error || !salva) throw new Error(`Falha ao gravar a cotação do parceiro local: ${error?.message}`);

  return {
    tipo: "parceiro_local",
    transportadoraId: null,
    nome: nomeOpcaoParceiroLocal(c),
    valor: c.total,
    balsa: c.balsa,
    prazoMin: Math.ceil(rota.valor.duracao_s / 60) + JANELA_ACEITE_MIN,
    cotacaoParceiroId: (salva as unknown as { id: string }).id,
  };
}
