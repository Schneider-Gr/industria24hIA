// Fonte única da ajuda contextual do painel do seller (spec
// `seller-ajuda-contextual/dicas-campo`). Alimenta os tooltips dos
// formulários e, no futuro, os passos do tour — para o painel e o Manual do
// Seller nunca divergirem.
//
// origem `manual`   = texto derivado do Manual do Seller já publicado em
//                     /seller/central-de-duvidas; aponta o tópico de origem.
// origem `rascunho` = escrito a partir do comportamento real do código,
//                     aguardando revisão da equipe (`revisada: false`).
//
// Campo cujo comportamento não pôde ser confirmado fica SEM dica, em vez de
// receber explicação especulativa.

export type PesoDica = "fixa" | "sob-demanda";
export type OrigemDica = "manual" | "rascunho";

export type Dica = {
  texto: string;
  peso: PesoDica;
  origem: OrigemDica;
  /** Slug do tópico em /seller/central-de-duvidas — obrigatório na origem `manual`. */
  topico?: string;
  /** `false` enquanto o rascunho não foi revisado pela equipe. */
  revisada?: boolean;
};

// Campos em que errar bloqueia recebimento, bloqueia checkout ou gera
// cobrança incorreta. Recebem dica de texto fixo, sem exigir clique.
export const CAMPOS_CRITICOS: Record<string, string[]> = {
  produto: [
    "valor",
    "quantidade_minima",
    "estoque_atual",
    "peso",
    "porcentagem_afiliado",
    "frete_gratis",
    "cep_produto",
  ],
  loja: ["chave_pix", "tipo_chave_pix", "valor_pedido_minimo"],
  "venda-futura": ["estoque", "valor", "previsao"],
  promocao: ["valor_unitario", "validade"],
  pedidos: ["codigo_entrega"],
};

export const DICAS: Record<string, Record<string, Dica>> = {
  produto: {
    nome: {
      texto: "Título que aparece na vitrine para o comprador.",
      peso: "sob-demanda",
      origem: "manual",
      topico: "cadastrar-produto",
    },
    valor: {
      texto:
        "Preço unitário padrão. Dele saem a taxa da plataforma e a comissão do afiliado, então feche a conta da margem antes de publicar.",
      peso: "fixa",
      origem: "manual",
      topico: "cadastrar-produto",
    },
    quantidade_minima: {
      texto:
        "Mínimo por pedido deste item (caixa, fardo). O comprador não consegue levar menos que isso, e ele vê o aviso \"Mínimo\" no carrinho. Não confunda com o valor mínimo da loja, que é o total do pedido.",
      peso: "fixa",
      origem: "manual",
      topico: "cadastrar-produto",
    },
    estoque_atual: {
      texto:
        "Mantenha sempre atualizado: a vitrine depende deste número, e anúncio que leva a produto sem estoque queima verba de campanha e reputação.",
      peso: "fixa",
      origem: "manual",
      topico: "cadastrar-produto",
    },
    sku: {
      texto: "Código interno do produto, para você conciliar com o seu próprio controle.",
      peso: "sob-demanda",
      origem: "manual",
      topico: "cadastrar-produto",
    },
    cep_produto: {
      texto:
        "CEP de onde o produto sai. Define o centro de distribuição mais próximo e, com isso, o frete e o prazo que o comprador vê. Errado aqui, seu produto aparece como indisponível na região certa.",
      peso: "fixa",
      origem: "manual",
      topico: "centro-distribuicao",
    },
    categoria_id: {
      texto: "Onde o produto aparece na navegação da vitrine.",
      peso: "sob-demanda",
      origem: "manual",
      topico: "cadastrar-produto",
    },
    subcategoria_id: {
      texto: "Refina a posição do produto dentro da categoria escolhida.",
      peso: "sob-demanda",
      origem: "manual",
      topico: "cadastrar-produto",
    },
    permite_afiliacao: {
      texto:
        "Deixa afiliados venderem este produto pelo link deles. Você ganha vendedor sem folha de pagamento; a comissão só é paga quando a venda vem pelo link.",
      peso: "sob-demanda",
      origem: "manual",
      topico: "afiliados",
    },
    porcentagem_afiliado: {
      texto:
        "Comissão paga ao afiliado por venda, descontada da sua parte no split, não da taxa da plataforma. O pagamento é automático por PIX quando você confirma a entrega.",
      peso: "fixa",
      origem: "manual",
      topico: "repasse",
    },
    permite_logistica_afiliado: {
      texto:
        "Ligado, este produto entra na exclusividade do afiliado logístico da sua loja: ele tem prioridade para pegar a entrega antes de a corrida abrir para o pool geral. Desligado, a corrida vai direto para o pool.",
      peso: "sob-demanda",
      origem: "rascunho",
      revisada: false,
    },
    parceiro_logistico_habilitado: {
      texto:
        "Ligado, a corrida deste produto nasce exigindo revisão do afiliado antes de poder ser aceita. É independente da exclusividade acima: um decide quem tem prioridade, este decide se a corrida passa por revisão.",
      peso: "sob-demanda",
      origem: "rascunho",
      revisada: false,
    },
    altura: {
      texto: "Em centímetros. Entra no cálculo de cubagem do frete.",
      peso: "sob-demanda",
      origem: "manual",
      topico: "transportadoras-frete",
    },
    comprimento: {
      texto: "Em centímetros. Entra no cálculo de cubagem do frete.",
      peso: "sob-demanda",
      origem: "manual",
      topico: "transportadoras-frete",
    },
    largura: {
      texto: "Em centímetros. Entra no cálculo de cubagem do frete.",
      peso: "sob-demanda",
      origem: "manual",
      topico: "transportadoras-frete",
    },
    peso: {
      texto:
        "Em quilos, como o resto do sistema calcula (o Manual do Seller diz gramas; o campo é kg). É o que mais afeta o frete: sem peso, a cotação sai errada.",
      peso: "fixa",
      origem: "manual",
      topico: "transportadoras-frete",
    },
    frete_gratis: {
      texto:
        "O frete deixa de ser cobrado do comprador e passa a sair da sua margem. Confira o custo de entrega até os CEPs que você atende antes de ligar.",
      peso: "fixa",
      origem: "rascunho",
      revisada: false,
    },
    centros: {
      texto: "De quais centros de distribuição este produto é despachado.",
      peso: "sob-demanda",
      origem: "manual",
      topico: "centro-distribuicao",
    },
    descricao: {
      texto:
        "Texto com as palavras que o comprador usaria para buscar. Descrição completa também pesa na seleção de produtos para as campanhas pagas da plataforma.",
      peso: "sob-demanda",
      origem: "manual",
      topico: "midia-paga",
    },
    imagem_url: {
      texto:
        "Foto de fundo limpo. É o primeiro filtro do comprador e um dos critérios de priorização na mídia paga.",
      peso: "sob-demanda",
      origem: "manual",
      topico: "midia-paga",
    },
  },

  loja: {
    nome: {
      texto: "Como a sua loja aparece para o comprador na vitrine.",
      peso: "sob-demanda",
      origem: "manual",
      topico: "configurar-loja",
    },
    descricao: {
      texto: "Texto curto sobre o que a sua loja produz ou vende.",
      peso: "sob-demanda",
      origem: "manual",
      topico: "configurar-loja",
    },
    chave_pix: {
      texto:
        "É por esta chave que o dinheiro das vendas cai. Sem chave válida o repasse fica inelegível e não sai; assim que você cadastra, o sistema reprocessa.",
      peso: "fixa",
      origem: "manual",
      topico: "repasse",
    },
    tipo_chave_pix: {
      texto:
        "Precisa corresponder ao formato da chave informada (CPF/CNPJ, e-mail, telefone ou aleatória). Tipo trocado faz a transferência falhar mesmo com a chave certa.",
      peso: "fixa",
      origem: "rascunho",
      revisada: false,
    },
    valor_pedido_minimo: {
      texto:
        "Valor total que o pedido precisa atingir na sua loja, o ticket mínimo. Abaixo dele o checkout não libera para o comprador. Deixe em branco para vender no varejo; valor alto demais afasta o comprador pequeno.",
      peso: "fixa",
      origem: "manual",
      topico: "cadastrar-produto",
    },
    permite_retirada_na_loja: {
      texto:
        "Libera o comprador a retirar o pedido no seu endereço, sem frete e sem entrega por parceiro logístico.",
      peso: "sob-demanda",
      origem: "rascunho",
      revisada: false,
    },
    logotipo_url: {
      texto: "Imagem quadrada da marca.",
      peso: "sob-demanda",
      origem: "manual",
      topico: "configurar-loja",
    },
    banner_url: {
      texto: "Imagem de 1580×450 px, no topo da página da sua loja.",
      peso: "sob-demanda",
      origem: "manual",
      topico: "configurar-loja",
    },
  },

  "venda-futura": {
    estoque: {
      texto: "Oferte 70% a 80% da capacidade da janela, nunca acima do que produz.",
      peso: "fixa",
      origem: "manual",
      topico: "venda-futura",
    },
    valor: {
      texto: "Pré-venda: de 5% a 15% abaixo do preço à vista, nunca acima.",
      peso: "fixa",
      origem: "manual",
      topico: "venda-futura",
    },
    previsao: {
      texto: "Produção mais margem de atraso. Datas vencidas somem sozinhas.",
      peso: "fixa",
      origem: "manual",
      topico: "venda-futura",
    },
  },

  promocao: {
    min_qtd: {
      texto:
        "Ponha logo acima do pedido médio do seu comprador: é o degrau que faz ele arredondar para cima.",
      peso: "sob-demanda",
      origem: "manual",
      topico: "desconto-progressivo",
    },
    valor_unitario: {
      texto:
        "Margem positiva depois da taxa da plataforma e da comissão do afiliado.",
      peso: "fixa",
      origem: "manual",
      topico: "desconto-progressivo",
    },
    validade: {
      texto:
        "De 15 a 30 dias: cria urgência e mantém o selo na vitrine.",
      peso: "fixa",
      origem: "manual",
      topico: "desconto-progressivo",
    },
  },

  pedidos: {
    codigo_entrega: {
      texto:
        "Código que o comprador recebeu por WhatsApp e te passa no momento da entrega. Não entregue sem ele: pedido pago e sem código lançado fica com o pagamento retido.",
      peso: "fixa",
      origem: "manual",
      topico: "pedidos-entrega",
    },
    transferidos: {
      texto:
        "Quantas linhas do pedido já tiveram o repasse feito. O repasse dispara quando você confirma a entrega, não quando o comprador paga.",
      peso: "sob-demanda",
      origem: "manual",
      topico: "repasse",
    },
    pagamento: {
      texto:
        "Pagamento realizado significa que o dinheiro está retido na plataforma, não que já é seu. Ele cai no seu PIX quando a entrega é confirmada.",
      peso: "sob-demanda",
      origem: "manual",
      topico: "repasse",
    },
  },
};

export function buscarDica(tela: string, campo: string): Dica | undefined {
  return DICAS[tela]?.[campo];
}
