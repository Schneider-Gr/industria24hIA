// Decisões puras de finalizarCompra(): agrupar o carrinho por loja e montar o
// payload `entrega` de cada pedido. Ficavam inline numa função de ~295 linhas
// (complexidade cognitiva 57, a maior do sistema) e no meio do caminho do
// dinheiro — aqui têm check em montagem-pedido.test.ts.

import type { z } from "zod";
import type { freteLojaSchema, itemCarrinhoSchema } from "./schemas";

export type ItemCarrinho = z.infer<typeof itemCarrinhoSchema>;
export type FreteLoja = z.infer<typeof freteLojaSchema>;

// Cada loja vira um pedido próprio (redesign 2026-07-29): `pedidos.loja_id` é
// FK not null, o schema nunca suportou pedido multi-vendedor. Preserva a ordem
// de chegada dos itens — o comprador vê os pedidos na ordem do carrinho.
//
// Frete a combinar (0203): os itens marcados pelo seller saem num pedido
// próprio da loja (chave `<loja_id>:combinar`), porque o frete deles só vem da
// cotação do vendedor e o dos demais segue o caminho de sempre.
export const SUFIXO_COMBINAR = ":combinar";

export function lojaDoGrupo(chave: string): string {
  return chave.endsWith(SUFIXO_COMBINAR) ? chave.slice(0, -SUFIXO_COMBINAR.length) : chave;
}

export function agruparItensPorLoja<T extends Pick<ItemCarrinho, "loja_id" | "produto_id">>(
  itens: T[],
  combinar: ReadonlySet<string> = new Set(),
): Map<string, T[]> {
  const grupos = new Map<string, T[]>();
  for (const item of itens) {
    const chave = combinar.has(item.produto_id) ? item.loja_id + SUFIXO_COMBINAR : item.loja_id;
    const grupo = grupos.get(chave);
    if (grupo) grupo.push(item);
    else grupos.set(chave, [item]);
  }
  return grupos;
}

/** "Tudo com o vendedor": a cotação cobre o carrinho inteiro da loja, então
 * os dois grupos da loja voltam a ser um pedido só, sob a chave combinar. */
export function juntarTudoComVendedor(
  grupos: Map<string, ItemCarrinho[]>,
  lojasTudo: ReadonlySet<string>,
): Map<string, ItemCarrinho[]> {
  const saida = new Map<string, ItemCarrinho[]>();
  for (const [chave, itensGrupo] of grupos) {
    const loja = lojaDoGrupo(chave);
    const destino = lojasTudo.has(loja) ? loja + SUFIXO_COMBINAR : chave;
    saida.set(destino, [...(saida.get(destino) ?? []), ...itensGrupo]);
  }
  return saida;
}

// O objeto montado em finalizarCompra a partir do formulário: `retirada` só
// tem tipo, `entrega` traz o endereço.
export type DadosEntrega = { tipo: string } & Record<string, string | undefined>;

export type MontarEntregaArgs = {
  entrega: DadosEntrega;
  tipo: string;
  freteLoja: FreteLoja | undefined;
  cupomCodigo: string | null;
  checkoutRef: string;
};

// transportadora_id, cotacao_externa_id e cupom viajam DENTRO de `entrega`, não
// como parâmetro novo do RPC: checkout_criar_pedido tem uma cadeia de overloads
// por aridade (3→4→5→6 args, ver 0065/0074/0107/0119) onde cada wrapper repassa
// `entrega` intacto pro de baixo — um parâmetro novo exigiria replicar a cadeia
// inteira e arriscaria colisão de tipo entre overloads (ver comentário da 0107).
//
// checkout_ref acompanha o cupom (não a loja): um checkout multiloja com o mesmo
// cupom conta como um único uso em cupom_usos (unique cupom_id+checkout_ref).
export function montarEntregaDaLoja({
  entrega,
  tipo,
  freteLoja,
  cupomCodigo,
  checkoutRef,
}: MontarEntregaArgs): Record<string, unknown> {
  const comTransportadora =
    tipo === "entrega" && freteLoja?.cotacao_vendedor_id
      ? {
          ...entrega,
          cotacao_vendedor_id: freteLoja.cotacao_vendedor_id,
          tudo_com_vendedor: freteLoja.tudo_com_vendedor === true,
        }
      : tipo === "entrega" && freteLoja?.transportadora_id
      ? {
          ...entrega,
          transportadora_id: freteLoja.transportadora_id,
          cotacao_externa_id: freteLoja.cotacao_uber_direct_id ?? null,
        }
      : { ...entrega };

  return cupomCodigo
    ? { ...comTransportadora, cupom_codigo: cupomCodigo, checkout_ref: checkoutRef }
    : comTransportadora;
}

export type PerfilPjMercadoFuturo = {
  documentoTipo: string;
  documentoPj: string;
  produtorRural: boolean;
  razaoSocial: string | null;
};

export type GateMercadoFuturo =
  | { ok: true; perfil: PerfilPjMercadoFuturo }
  | { ok: false; error: string };

// Gate B2B do Mercado Futuro (docs/e5-seller-onboarding-b2b-auditoria.md): sem
// documento PJ e aceite dos Termos a compra não segue. A RPC
// checkout_criar_pedido também rejeita, mas validar aqui evita depender só da
// mensagem de erro do banco. Só valida — quem grava o perfil é a action.
export function validarGateMercadoFuturo(campos: {
  documentoTipo: string;
  documentoPj: string;
  produtorRural: boolean;
  razaoSocial: string | null;
  aceitouTermos: boolean;
}): GateMercadoFuturo {
  if (!campos.documentoTipo || !campos.documentoPj) {
    return {
      ok: false,
      error: "Compra no Mercado Futuro exige CNPJ ou Inscrição Estadual de produtor rural.",
    };
  }
  if (!campos.aceitouTermos) {
    return { ok: false, error: "É necessário aceitar os Termos de Compra do Mercado Futuro." };
  }
  return {
    ok: true,
    perfil: {
      documentoTipo: campos.documentoTipo,
      documentoPj: campos.documentoPj,
      produtorRural: campos.produtorRural,
      razaoSocial: campos.razaoSocial,
    },
  };
}
