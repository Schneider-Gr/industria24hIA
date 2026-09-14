// Mapa rota do painel → ajuda daquela tela. Liga as três fontes que já
// existem: as dicas de campo (`dicas.ts`), o Manual do Seller
// (`manual-seller.ts`, renderizado em /seller/central-de-duvidas) e os
// passos do tour (`TourGuiado.tsx`).
//
// Tela sem tópico correspondente no manual fica FORA do mapa de propósito: o
// botão simplesmente não aparece ali, em vez de abrir um painel vazio ou
// apontar para explicação inventada. Coletiva, leilão, crédito, disputas,
// reputação, rotas e carrinhos abandonados estão nesse caso (censo da Issue
// #611) e entram quando o manual cobrir o assunto.

export type AjudaTela = {
  /** Nome da tela no painel, usado no cabeçalho do balão. */
  titulo: string;
  /** Slug do tópico em /seller/central-de-duvidas. */
  topico: string;
  /** Chave da tela em `DICAS` (`dicas.ts`), quando a tela tem formulário. */
  dicas?: string;
};

export const AJUDA_POR_ROTA: Record<string, AjudaTela> = {
  "/seller": { titulo: "Dashboard", topico: "como-funciona" },
  "/seller/produtos": { titulo: "Produtos", topico: "cadastrar-produto", dicas: "produto" },
  "/seller/minha-loja": { titulo: "Minha Loja", topico: "configurar-loja", dicas: "loja" },
  "/seller/centros": { titulo: "Centro de distribuição", topico: "centro-distribuicao" },
  "/seller/promocoes": { titulo: "Promoções", topico: "desconto-progressivo", dicas: "promocao" },
  "/seller/venda-futura": { titulo: "Venda futura", topico: "venda-futura", dicas: "venda-futura" },
  "/seller/pedidos": { titulo: "Pedidos", topico: "pedidos-entrega", dicas: "pedidos" },
  "/seller/entregas": { titulo: "Entregas", topico: "pedidos-entrega" },
  "/seller/afiliados": { titulo: "Afiliados", topico: "afiliados" },
  "/seller/parceiro-logistica": { titulo: "Parceiro logístico", topico: "parceiro-logistico" },
  "/seller/analise-geral": { titulo: "Análise geral", topico: "resultados" },
  "/seller/ads": { titulo: "Mídia paga", topico: "midia-paga" },
  "/seller/transportadoras": { titulo: "Transportadoras", topico: "transportadoras-frete" },
};

export function buscarAjudaDaTela(pathname: string): AjudaTela | undefined {
  return AJUDA_POR_ROTA[pathname];
}
