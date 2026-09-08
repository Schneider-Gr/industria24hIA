import "server-only";

import { coordenadasDeCeps } from "@/lib/ceps-geo";
import { ordenarPorPesos, type OrigemProduto } from "./proximidade-ordem";

import { createServiceClient, isServiceConfigured } from "@/lib/supabase/service";

// Ordenação da vitrine por proximidade (PRD 030, fase 3).
//
// Decisão 2026-09-05, mantida aqui: a vitrine NÃO esconde produto por
// localização. Hoje 81 dos 206 produtos não têm CEP próprio nem da loja —
// filtrar deixaria 39% do catálogo invisível. Então proximidade só reordena:
// quem tem coordenada sobe por distância, quem não tem fica ao final na ordem
// que já vinha do banco.
//
// `raio_entrega_km` (migration 0161) entra como corte de confiança, não como
// filtro: produto cujo raio o comprador excede vai para o fim junto com os sem
// coordenada, mas continua na página — o aviso de indisponibilidade e o
// bloqueio real seguem na página do produto e na RPC checkout_criar_pedido.

export type ItemOrdenavel = { id: string };

type Origem = OrigemProduto;

/** CEP de cada produto: o próprio, ou o da loja. Service client porque
 *  `lojas.cep` é PII e não está na view pública `lojas_vitrine`. */
async function origensDosProdutos(ids: string[]): Promise<Map<string, Origem>> {
  const origens = new Map<string, Origem>();
  if (ids.length === 0 || !isServiceConfigured) return origens;

  const supabase = createServiceClient();
  const { data: produtos } = await supabase
    .from("produtos")
    .select("id, loja_id, cep_produto, raio_entrega_km")
    .in("id", ids);
  if (!produtos) return origens;

  const semCep = [...new Set(produtos.filter((p) => !limpaCep(p.cep_produto)).map((p) => p.loja_id))];
  const cepDaLoja = new Map<string, string>();
  if (semCep.length > 0) {
    const { data: lojas } = await supabase.from("lojas").select("id, cep").in("id", semCep);
    for (const l of lojas ?? []) {
      const cep = limpaCep(l.cep);
      if (cep) cepDaLoja.set(l.id, cep);
    }
  }

  for (const p of produtos) {
    origens.set(p.id, {
      cep: limpaCep(p.cep_produto) ?? cepDaLoja.get(p.loja_id) ?? null,
      raioKm: p.raio_entrega_km,
    });
  }
  return origens;
}

function limpaCep(valor: string | null | undefined): string | null {
  const limpo = (valor ?? "").replace(/\D/g, "");
  return limpo.length === 8 ? limpo : null;
}

/** Reordena a lista pela distância até o CEP do comprador. Nunca remove item e
 *  nunca lança: sem CEP, sem service role ou sem chave do Maps a lista volta
 *  intacta. */
export async function ordenarPorProximidade<T extends ItemOrdenavel>(
  itens: T[],
  cepComprador: string | null,
): Promise<T[]> {
  const cepDestino = limpaCep(cepComprador);
  if (!cepDestino || itens.length < 2) return itens;

  const origens = await origensDosProdutos(itens.map((i) => i.id));
  if (origens.size === 0) return itens;

  const ceps = [...new Set([...origens.values()].map((o) => o.cep).filter((c): c is string => !!c))];
  const coordenadas = await coordenadasDeCeps([cepDestino, ...ceps]);

  const destino = coordenadas.get(cepDestino);
  if (!destino) return itens;

  return ordenarPorPesos(itens, origens, coordenadas, destino);
}
