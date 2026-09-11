// Conteúdo do "Manual do Seller" (PDF de operação do painel, set/2026),
// transcrito para a Central de Dúvidas. Domínio trocado para industria24.com.br;
// notas internas do PDF (placeholders "[Confirmar...]", nota de captação,
// "confirme o rótulo") ficaram de fora. Screenshots do PDF não foram portados.

export type Bloco =
  | { tipo: "p"; texto: string }
  | { tipo: "passos"; itens: string[] }
  | { tipo: "lista"; itens: string[] }
  | { tipo: "campos"; itens: Array<[string, string]> }
  | { tipo: "tabela"; cabecalho: string[]; linhas: string[][]; nota?: string }
  | { tipo: "aviso"; titulo: string; texto: string }
  | { tipo: "subtitulo"; texto: string };

export type Topico = { id: string; numero: string; titulo: string; blocos: Bloco[] };

export const MANUAL_SELLER: Topico[] = [
  {
    id: "como-funciona",
    numero: "01",
    titulo: "Como a plataforma funciona",
    blocos: [
      {
        tipo: "p",
        texto:
          "O Indústria 24h vende direto da fábrica ao comprador (atacado e varejo na mesma loja). Você monta a loja, cadastra produtos e define preços e comissões. O pagamento é protegido: o comprador paga, o dinheiro fica retido, e só cai no seu PIX quando você confirma a entrega com o código de entrega.",
      },
      { tipo: "subtitulo", texto: "O ciclo de uma venda" },
      {
        tipo: "passos",
        itens: [
          "Comprador paga pelo site (PIX ou parcelado).",
          "O valor fica retido na plataforma, não vai direto pra você.",
          "Você recebe o pedido em Pedidos, separa a mercadoria e entrega.",
          "Na entrega, o comprador te passa o código de entrega (ele recebeu por WhatsApp).",
          "Você lança o código no painel → o pagamento cai no seu PIX e a comissão do afiliado é paga automaticamente.",
        ],
      },
    ],
  },
  {
    id: "acessar-painel",
    numero: "02",
    titulo: "Acessar o painel do seller",
    blocos: [
      {
        tipo: "passos",
        itens: [
          "Entre em industria24.com.br e faça login (a mesma conta serve para comprar, vender, ser afiliado e parceiro logístico).",
          "Abra industria24.com.br/seller. O menu lateral tem tudo: Dashboard · Análise Geral · Produtos · Afiliados produtos · Parceiro logística · Centro de distribuição · Promoções · Venda Futura · Pedidos · Minha Loja · Dados · Tutoriais · Central de Dúvidas.",
          "O Dashboard mostra a visão do mês e os repasses a efetuar. É a sua tela de abertura todo dia.",
        ],
      },
    ],
  },
  {
    id: "configurar-loja",
    numero: "03",
    titulo: "Configurar a loja",
    blocos: [
      {
        tipo: "p",
        texto:
          "Menu Minha Loja → Editar Loja, com a pré-visualização ao lado mostrando como a loja fica no site.",
      },
      {
        tipo: "campos",
        itens: [
          ["LogoTipo Loja", "Imagem quadrada da marca."],
          ["Banner Loja", "Imagem 1580×450 px, no topo da página da loja."],
          ["Nome da Loja", "Como aparece para o comprador."],
          ["Descrição da loja", "Texto curto sobre o produto/serviço."],
        ],
      },
      { tipo: "p", texto: "Clique Salvar Alterações. Use Ver Loja para conferir no site." },
      {
        tipo: "aviso",
        titulo: "Antes de vender",
        texto:
          "Confira a chave PIX nos dados da conta (menu Dados). É por ela que o dinheiro das vendas cai: errou a chave, não recebe.",
      },
    ],
  },
  {
    id: "centro-distribuicao",
    numero: "04",
    titulo: "Cadastrar centro de distribuição",
    blocos: [
      {
        tipo: "p",
        texto:
          "Menu Centro de distribuição. O CD diz de onde o produto sai; a plataforma usa isso para mostrar ao comprador o estoque mais perto do CEP dele, com frete e prazo menores.",
      },
      {
        tipo: "passos",
        itens: [
          "Clique Cadastrar Centro.",
          "Informe nome do CD, localização (CEP / endereço) e estado.",
          "Salve. Ele aparece na lista com status ATIVO. Você pode ter vários CDs.",
        ],
      },
    ],
  },
  {
    id: "cadastrar-produto",
    numero: "05",
    titulo: "Cadastrar produto",
    blocos: [
      {
        tipo: "p",
        texto:
          "Menu Produtos. No topo: Total Produtos, Valor total em estoque e Estoque Crítico. Clique Cadastrar Novo.",
      },
      { tipo: "subtitulo", texto: "Barra de topo da lista" },
      {
        tipo: "campos",
        itens: [
          ["Total Produtos", "Quantos SKUs a loja tem cadastrados."],
          ["Valor total em estoque", "Soma de (preço × estoque) de todos os produtos."],
          [
            "Estoque Crítico",
            "Quantos produtos estão com estoque baixo. O ⚠ vermelho na linha marca cada um; atualize o estoque para limpar o alerta.",
          ],
          ["Buscar / filtro \"Todos\"", "Busca por nome e filtra por status (Aprovado, em análise…)."],
          ["Cadastrar Novo", "Abre o formulário de novo produto."],
          ["Cupom Geral", "Cria/edita o cupom da loja inteira (ver tópico 07)."],
          [
            "Cadastrar Valor mínimo",
            "Define o valor mínimo de pedido (ticket mínimo) da loja. Ver \"Os dois mínimos\" abaixo.",
          ],
        ],
      },
      { tipo: "subtitulo", texto: "Colunas da lista" },
      {
        tipo: "p",
        texto:
          "Nº · Descrição · Valor · Status · Venda Futura (sim/não) · Permite Consignado · Estoque atual · Valor Estoque · Ações.",
      },
      { tipo: "subtitulo", texto: "Ícones de ação em cada linha" },
      {
        tipo: "campos",
        itens: [
          ["✏ Lápis (azul)", "Editar o produto: abre o formulário com os dados preenchidos."],
          ["🗑 Lixeira (vermelho)", "Excluir o produto da loja."],
          [
            "⊕ Círculo com \"+\" (verde)",
            "Entrada rápida de estoque / reposição: soma unidades sem abrir a edição completa.",
          ],
          [
            "🚚 Caminhão (roxo)",
            "Liga / desliga as \"Opções de entrega do produto\". Um clique ativa (aviso \"Opções de entrega do produto ativadas com sucesso!\"), outro desativa. Habilita o produto no fluxo de entrega da plataforma.",
          ],
          [
            "✈ Avião",
            "Habilitar entrega por parceiro logístico para este produto. Abre a janela Parceiro de entrega: você informa o valor da entrega (R$) e confirma em \"Sim, tenho certeza!\". Fica cinza nos produtos que ainda não têm parceiro liberado.",
          ],
          ["▤ Documento (roxo)", "Ver os detalhes / o histórico do produto."],
        ],
      },
      {
        tipo: "aviso",
        titulo: "Ordem prática",
        texto:
          "1 · Caminhão 🚚 liga as opções de entrega do produto. 2 · Avião ✈ libera esse produto para os parceiros logísticos e define o valor da entrega. 3 · O parceiro solicita e você aprova no menu Parceiro logística (tópico 10).",
      },
      { tipo: "subtitulo", texto: "Formulário, campo a campo" },
      {
        tipo: "campos",
        itens: [
          ["Imagem", "Clique no círculo e suba a foto; depois Salvar."],
          ["Nome do Produto", "Título que aparece na vitrine."],
          ["Valor Produto", "Preço unitário padrão."],
          ["Quantidade mínima", "Mínimo por pedido (caixa, fardo…)."],
          ["Estoque atual", "Mantenha sempre atualizado: o site depende disso."],
          ["Onde o produto se encontra?", "CEP do produto → define o CD mais próximo."],
          ["Permitir afiliação", "SIM para deixar afiliados venderem este produto."],
          ["Porcentagem afiliado", "Comissão paga ao afiliado por venda (ex.: 2%)."],
          ["Categoria / Sub Categoria", "Onde o produto aparece na navegação."],
          ["Seus / Outros Centros de distribuição", "De quais CDs este produto é despachado."],
          ["Altura / Comprimento / Largura", "Em cm, para o cálculo de frete."],
          ["Peso do Produto", "Em quilos (o PDF do manual diz gramas; o campo do painel é kg)."],
          ["SKU", "Código interno do produto."],
          ["Descrição desse produto", "Texto com palavras-chave: ajuda a ser encontrado."],
        ],
      },
      {
        tipo: "p",
        texto:
          "Clique Finalizar Cadastro. O produto entra com status e aparece na vitrine após aprovação.",
      },
      {
        tipo: "aviso",
        titulo: "Muitos SKUs",
        texto: "Use o importador por planilha (modelo de carga de produtos) em vez de cadastrar um a um.",
      },
      { tipo: "subtitulo", texto: "Os dois mínimos: quantidade e valor do pedido" },
      {
        tipo: "campos",
        itens: [
          [
            "Quantidade mínima do produto",
            "Definida no formulário de cada produto (campo Quantidade mínima). No carrinho aparece como \"Mínimo: 1000\" abaixo da quantidade. O comprador não consegue levar menos que isso daquele item.",
          ],
          [
            "Valor mínimo da loja (ticket mínimo)",
            "Definido no botão Cadastrar Valor mínimo da tela de Produtos. É o valor total que o pedido precisa atingir para aquele seller. Ex.: ticket mínimo R$ 10.000; se o carrinho soma R$ 5.000, o checkout não libera.",
          ],
        ],
      },
      {
        tipo: "p",
        texto:
          "Quando o carrinho está abaixo do ticket mínimo, o comprador vê, no lugar do botão de finalizar: o aviso \"[Nome da loja] – compra mínima R$ X\" em vermelho no topo dos itens daquele seller, o botão \"Adicione mais itens ao seu carrinho!\" e o alerta \"essa loja permite compra mínima de R$ X, revise a quantidade de itens\".",
      },
      {
        tipo: "aviso",
        titulo: "Para o seller",
        texto:
          "O ticket mínimo é uma trava por loja, útil para operação de atacado (ex.: material de construção, olaria). Deixe em branco / zero para venda no varejo. Ajuste com cuidado: um valor alto demais afasta o comprador pequeno.",
      },
    ],
  },
  {
    id: "desconto-progressivo",
    numero: "06",
    titulo: "Criar desconto progressivo",
    blocos: [
      {
        tipo: "p",
        texto:
          "Menu Promoções. Faixas de preço por quantidade: quanto mais o comprador leva, menor o preço unitário. Atacado e varejo no mesmo anúncio.",
      },
      { tipo: "subtitulo", texto: "Cadastrar uma faixa" },
      {
        tipo: "passos",
        itens: [
          "Clique Cadastrar novo.",
          "Em Escolha o produto em oferta, selecione o produto (mostra o estoque atual).",
          "A partir de: quantidade mínima da faixa (ex.: 25).",
          "O produto fica por: preço unitário nessa faixa (ex.: R$ 3,40).",
          "Validade: data em que a campanha encerra sozinha.",
          "Criar desconto. Repita para as faixas seguintes (50 un, 100 un…).",
        ],
      },
      {
        tipo: "aviso",
        titulo: "Do lado do comprador",
        texto: "No carrinho, ao aumentar a quantidade, o preço cai para a faixa correspondente automaticamente.",
      },
      { tipo: "subtitulo", texto: "Como calcular as faixas (a margem vem primeiro)" },
      {
        tipo: "passos",
        itens: [
          "Saiba o custo real por unidade (produção + embalagem) e a margem mínima abaixo da qual não vale vender.",
          "A faixa 1 é o seu preço de varejo normal, sem desconto. É a âncora.",
          "Cada faixa seguinte desconta só uma parte do ganho de escala (menos manuseio, menos frete por unidade, giro mais rápido), não a sua margem.",
          "Feche a conta de cada faixa: preço da faixa × quantidade ainda tem que dar margem positiva depois da taxa da plataforma e da comissão de afiliado.",
          "Teto prático do desconto da última faixa: 15–25% para alimentos, 20–35% para materiais de construção e insumos (giro alto, margem menor).",
        ],
      },
      {
        tipo: "tabela",
        cabecalho: ["Faixa", "Preço un.", "Desconto", "Margem/un. *"],
        linhas: [
          ["1–999", "R$ 5,00", "—", "R$ 1,80"],
          ["a partir de 1.000", "R$ 4,70", "−6%", "R$ 1,50"],
          ["a partir de 5.000", "R$ 4,40", "−12%", "R$ 1,20"],
          ["a partir de 10.000", "R$ 4,10", "−18%", "R$ 0,90"],
        ],
        nota:
          "Exemplo: tijolo, custo R$ 3,20, tabela R$ 5,00. * Margem bruta antes da taxa da plataforma e da comissão de afiliado; desconte-as para chegar na margem líquida.",
      },
      { tipo: "subtitulo", texto: "Estratégia de marketing das faixas" },
      {
        tipo: "lista",
        itens: [
          "Ancoragem: a faixa de preço cheio faz a segunda parecer barata. Nunca comece já com desconto.",
          "Degrau que puxa o próximo pedido: ponha a segunda faixa logo acima do pedido médio atual do seu comprador. Se ele costuma levar 800, a faixa em 1.000 faz ele \"arredondar pra cima\" e sobe o seu ticket médio.",
          "3 a 4 faixas, não mais: muitas faixas confundem e diluem o efeito.",
          "Números que leem bem: R$ 4,70 melhor que R$ 4,68; 1.000 / 5.000 / 10.000 melhor que 1.200 / 4.800.",
          "Validade curta com renovação (15–30 dias): a data cria urgência; renovar mantém o selo \"com desconto progressivo\" na vitrine, que atrai clique.",
          "Não canibalize a venda direta: se você já vende volume para um cliente fora da plataforma, não ponha uma faixa mais barata na vitrine. A vitrine serve para ampliar, não substituir a relação direta.",
          "Combine com a mídia paga (tópico 15): produto com faixa ativa + campanha converte muito melhor num anúncio (\"compre 1.000, pague X\").",
        ],
      },
    ],
  },
  {
    id: "cupom-desconto",
    numero: "07",
    titulo: "Criar cupom de desconto",
    blocos: [
      {
        tipo: "p",
        texto:
          "Cupom vale para a loja inteira (percentual sobre o pedido), diferente do desconto progressivo, que é por produto e por quantidade. Menu Produtos → botão Cupom Geral.",
      },
      { tipo: "subtitulo", texto: "Criar" },
      {
        tipo: "passos",
        itens: [
          "Clique Cupom Geral. Abre a janela Criar cupom para geral.",
          "Código cupom: o texto que o comprador digita no checkout (ex.: ARTEMIS).",
          "% desconto: percentual sobre o pedido (ex.: 10).",
          "Expira em: data de validade.",
          "Criar. O cupom entra na lista Cupom atual.",
        ],
      },
      { tipo: "subtitulo", texto: "Editar ou suspender" },
      {
        tipo: "p",
        texto:
          "Na lista Cupom atual, cada cupom tem Novo código, Nova % e Validade → Salvar para alterar, ou Suspender para desativar sem apagar.",
      },
      {
        tipo: "aviso",
        titulo: "Cuidado",
        texto:
          "Cupom incide sobre o valor da venda e sai da sua margem, não da taxa da plataforma. Use com validade curta e percentual controlado.",
      },
    ],
  },
  {
    id: "venda-futura",
    numero: "08",
    titulo: "Criar venda futura",
    blocos: [
      {
        tipo: "p",
        texto:
          "Menu Venda Futura. Vender agora um produto que ainda vai produzir: garante caixa antecipado e mede a demanda.",
      },
      { tipo: "subtitulo", texto: "Criar" },
      {
        tipo: "passos",
        itens: [
          "Clique Criar nova.",
          "Em Selecione o produto, escolha um produto existente. Ele é duplicado e entra em \"modo venda futura\".",
          "Estoque: quanto você terá na data. Valor: preço da oferta.",
          "Disponibilidade: data em que o produto estará pronto para envio.",
          "Criar venda futura. Adicione mais datas repetindo o processo (cada data com seu estoque e preço).",
        ],
      },
      {
        tipo: "aviso",
        titulo: "Importante",
        texto: "Garanta o estoque na data prometida. O site remove sozinho as datas vencidas.",
      },
      { tipo: "subtitulo", texto: "Como precificar e dimensionar" },
      {
        tipo: "passos",
        itens: [
          "Preço: venda futura é pré-venda. O comprador assume o risco de esperar, então o preço é igual ou menor que o de pronta-entrega, nunca maior. Prêmio típico por antecipar: 5–15% abaixo do preço à vista.",
          "Quanto ofertar: nunca acima da sua capacidade real para a data. Regra: oferte 70–80% da capacidade planejada da janela, deixando folga para imprevisto.",
          "Data: janela realista = tempo de produção + margem de atraso. Para safra/colheita, alinhe com o calendário agrícola.",
          "Escalone com várias datas: ex. 30% para 01/jan, 40% para 15/jan, 30% para 30/jan. Não concentre tudo num pico de produção.",
        ],
      },
      { tipo: "subtitulo", texto: "Estratégia de marketing da venda futura" },
      {
        tipo: "lista",
        itens: [
          "Teste de demanda antes de produzir: abra uma venda futura pequena de um produto novo. Esgotou rápido → produz mais com segurança. Não vendeu → você não imobilizou capital.",
          "Trave preço na entressafra: ofereça agora para entrega no período em que o preço de mercado historicamente sobe. O comprador garante o preço baixo, você garante o cliente e o caixa.",
          "Caixa antecipado = capital de giro: o dinheiro entra (retido) antes de você produzir. Use como critério para priorizar a linha de produção.",
          "Mensagem clara: \"Garanta agora, receba em [mês]\". A plataforma pode incluir venda futura nas campanhas de mídia paga (tópico 15).",
          "Cumpra a primeira janela no prazo, mesmo com prejuízo pontual: a reputação de venda futura é frágil e é o que destrava as próximas.",
        ],
      },
    ],
  },
  {
    id: "afiliados",
    numero: "09",
    titulo: "Habilitar e acompanhar afiliados",
    blocos: [
      {
        tipo: "p",
        texto:
          "Afiliado é quem vende seu produto por um link e ganha comissão, sem estoque e sem faturar. Você ganha vendedor sem folha de pagamento.",
      },
      {
        tipo: "passos",
        itens: [
          "No cadastro de cada produto, deixe Permitir afiliação = SIM e defina a Porcentagem afiliado.",
          "Menu Afiliados produtos: veja Pedidos afiliação e Pedidos Pendentes.",
          "Na lista (Nome Representante · Produto · Porcentagem · Data · Status), aprove ou ajuste cada afiliação. Status: APROVADA, EM ANÁLISE, SUSPENSA.",
          "Quando o afiliado vende, o pedido cai em Pedidos normalmente. Ao você confirmar a entrega, a comissão é paga ao afiliado por PIX automático.",
        ],
      },
    ],
  },
  {
    id: "parceiro-logistico",
    numero: "10",
    titulo: "Parceiro logístico (entregador)",
    blocos: [
      {
        tipo: "p",
        texto:
          "Parceiro logístico é quem faz a entrega e recebe por valor por km, via split automático. Motoristas de app e entregadores podem ser parceiro logístico e afiliado ao mesmo tempo.",
      },
      { tipo: "subtitulo", texto: "Do lado do seller: menu Parceiro logística" },
      {
        tipo: "passos",
        itens: [
          "Libere o produto para entrega por parceiro: na tela de Produtos, clique no ícone ✈ da linha do produto → janela Parceiro de entrega → informe o valor da entrega → \"Sim, tenho certeza!\".",
          "O painel mostra Parcerias fechadas e Pedidos Pendentes.",
          "Na Lista de parceiros (Representante · Produto · Valor por Km · Status · Ações), cada solicitação chega como EM ANÁLISE.",
          "Clique em Ações (editar) para definir/ajustar o Valor por Km daquele parceiro para aquele produto e aprovar → status APROVADA.",
          "A partir daí, pedidos daquele produto podem ser entregues por esse parceiro, com o frete indo por split para ele.",
        ],
      },
      { tipo: "subtitulo", texto: "Do lado do parceiro" },
      {
        tipo: "p",
        texto:
          "O entregador acessa o painel próprio (menu Produtos disponíveis · Entregas aceitas · Entregas disponíveis · Configurações). Em Produtos Elegíveis ele vê produto, local de origem e valor por km, e solicita vínculo (Mostrar vínculos existentes). Depois de aprovado pelo seller, aceita as entregas disponíveis.",
      },
    ],
  },
  {
    id: "pedidos-entrega",
    numero: "11",
    titulo: "Receber pedidos e confirmar entrega",
    blocos: [
      {
        tipo: "p",
        texto:
          "Menu Pedidos. Colunas: Id · Cliente · Data · Qde itens · Transferidos · Entregues · Valor Pedido · Pagamento (PAGAMENTO REALIZADO – PIX ou AGUARDANDO PAGAMENTO).",
      },
      {
        tipo: "passos",
        itens: [
          "Abra o pedido pago. Confira itens e endereço.",
          "Separe a mercadoria e faça a entrega (própria, parceiro logístico ou fulfillment).",
          "Na entrega, peça o código de entrega ao comprador. Não entregue sem ele.",
          "Lance o código no pedido → status muda para Entregue e o pagamento é liberado no seu PIX.",
        ],
      },
      {
        tipo: "aviso",
        titulo: "O que trava seu dinheiro",
        texto: "Pedido pago mas sem o código lançado = pagamento retido. Rode a fila de pedidos todo dia.",
      },
    ],
  },
  {
    id: "repasse",
    numero: "12",
    titulo: "Repasse: Asaas, split e quando você recebe",
    blocos: [
      { tipo: "subtitulo", texto: "O que é o Asaas" },
      {
        tipo: "p",
        texto:
          "O Asaas é o provedor de pagamentos por trás do Indústria 24h. Ele gera a cobrança (PIX ou cartão) no checkout, guarda o dinheiro retido até a plataforma liberar, e faz o split: divide o valor entre as partes e envia cada uma por PIX para a chave de cada um. Você não emite cobrança nem transfere nada à mão: cadastra a chave PIX (menu Dados) e o Asaas faz o resto.",
      },
      { tipo: "subtitulo", texto: "O ciclo do dinheiro" },
      {
        tipo: "passos",
        itens: [
          "Comprador paga → status Pagamento Realizado. O dinheiro fica retido no Asaas. O repasse não dispara aqui.",
          "Entrega confirmada (você lança o código de entrega) → dispara o repasse automático: o sistema recalcula o pedido, checa a chave PIX de cada destinatário e o Asaas executa o split por PIX.",
          "Status do repasse: pendente → processando → transferido (com data). Ou inelegível (sem chave PIX) / falhou (erro na transferência; não desfaz a entrega, o admin reprocessa).",
        ],
      },
      { tipo: "subtitulo", texto: "O split: numa venda de R$ 1.000, quem recebe o quê" },
      {
        tipo: "tabela",
        cabecalho: ["Parte", "Recebe", "Regra"],
        linhas: [
          ["Você (loja)", "o que sobra", "valor dos produtos menos as deduções abaixo"],
          ["Plataforma", "taxa", "percentual sobre a venda (confirme o % vigente com a equipe)"],
          [
            "Afiliado de vendas",
            "comissão",
            "só se a venda veio pelo link dele; % que você definiu no produto (campo Porcentagem afiliado)",
          ],
          [
            "Afiliado logístico (parceiro de entrega)",
            "valor da entrega",
            "só se a entrega foi feita por parceiro; valor que você definiu no ícone ✈ (por km ou fixo)",
          ],
        ],
        nota:
          "Cada parte é um repasse separado, com a sua própria chave PIX. Tudo sai do mesmo pagamento do pedido, no mesmo momento (confirmação de entrega). Você nunca \"paga\" o afiliado nem o entregador: o Asaas desconta direto do split.",
      },
      { tipo: "subtitulo", texto: "Venda direta × venda por afiliado" },
      {
        tipo: "campos",
        itens: [
          [
            "Venda direta",
            "O comprador achou seu produto sozinho. Split = você + plataforma (+ entrega, se foi parceiro). Sem comissão de afiliado.",
          ],
          [
            "Venda por afiliado",
            "O comprador usou o link industria24.com.br/nomedele. Split = você + plataforma + comissão do afiliado (+ entrega, se foi parceiro). A sua parte cai pela comissão que você configurou no produto.",
          ],
        ],
      },
      {
        tipo: "aviso",
        titulo: "Chave PIX: o que trava o repasse",
        texto:
          "Sem chave PIX cadastrada e válida (menu Dados), o repasse fica inelegível e não sai. Assim que você cadastra, o sistema reprocessa. Vale para todos: loja, afiliado de vendas e afiliado logístico; cada um precisa da própria chave.",
      },
      { tipo: "subtitulo", texto: "Disputa e estorno: o que acontece com o repasse" },
      {
        tipo: "lista",
        itens: [
          "Ao confirmar a entrega, abre também a janela de disputa do comprador: 7 dias (produto comum) / 24h (perecível).",
          "O repasse acontece antes de a disputa poder existir. Se houver estorno depois, ele não reverte o PIX já transferido: a reversão é só interna (status do pedido + estoque + registro).",
          "Estorno (admin ou você): só em pedido que ainda não foi Enviado, com motivo obrigatório; restaura o estoque e marca repasses ainda pendentes como estornado.",
          "Decisão de disputa (reembolso / troca) é ação do admin, separada do estorno.",
        ],
      },
      { tipo: "subtitulo", texto: "Onde acompanhar" },
      {
        tipo: "lista",
        itens: [
          "Dashboard: \"repasses a efetuar\", o que ainda não caiu.",
          "Coluna Transferidos na tela de Pedidos: quantas linhas do pedido já tiveram o repasse feito.",
          "Painel de repasses (admin): extrato filtrável por status, só leitura.",
        ],
      },
      {
        tipo: "aviso",
        titulo: "Confirme com a equipe",
        texto:
          "Percentuais exatos (taxa da plataforma, regras de perecível, janelas de disputa) devem ser confirmados com a equipe do Indústria 24h: essas regras tiveram ajustes recentes.",
      },
    ],
  },
  {
    id: "resultados",
    numero: "13",
    titulo: "Acompanhar resultados",
    blocos: [
      {
        tipo: "p",
        texto:
          "Menu Análise Geral: Valor Total por mês, Produtos Vendidos, Vendas por categoria, o gráfico geral e o Top Produtos. Use para decidir o que colocar em desconto progressivo e em venda futura.",
      },
    ],
  },
  {
    id: "visao-comprador",
    numero: "14",
    titulo: "Como o comprador vê a sua loja",
    blocos: [
      {
        tipo: "p",
        texto:
          "Na vitrine pública, produtos com desconto progressivo aparecem com o preço cheio e o preço \"com desconto progressivo\". Produtos fora da região do comprador aparecem como Indisponível na sua região; por isso o cadastro correto do CD e do CEP do produto importa.",
      },
    ],
  },
  {
    id: "midia-paga",
    numero: "15",
    titulo: "Divulgação: programa de mídia paga da plataforma",
    blocos: [
      {
        tipo: "p",
        texto:
          "O Indústria 24h investe em anúncios pagos (Google, Instagram/Meta e outros) divulgando produtos e campanhas dos sellers, trazendo comprador para a sua loja sem você gerenciar campanha nem gastar do próprio bolso. O anúncio leva o clique direto para a página do seu produto na vitrine.",
      },
      { tipo: "subtitulo", texto: "Como funciona" },
      {
        tipo: "lista",
        itens: [
          "A plataforma seleciona os produtos e campanhas que vão ao ar. Prioriza os que têm boa foto, descrição completa, estoque disponível, preço competitivo e desconto progressivo ou venda futura ativos.",
          "Campanhas ligadas a selo regional / \"Feito no Amazonas\" podem ter prioridade.",
          "Custo para o seller, forma de adesão e verba mínima: consulte a equipe do Indústria 24h.",
        ],
      },
      { tipo: "subtitulo", texto: "O que fazer para ser elegível / priorizado" },
      {
        tipo: "passos",
        itens: [
          "Ficha do produto impecável: foto de fundo limpo, título claro, descrição com palavras-chave, medidas e peso corretos (frete errado quebra o anúncio).",
          "Estoque real e atualizado: anúncio que leva a produto sem estoque queima verba e reputação.",
          "Preço competitivo: compare com o que o mesmo produto custa fora da plataforma.",
          "Ligue uma promoção antes de pedir campanha: desconto progressivo ou venda futura com validade dá ao anúncio uma mensagem (\"compre X, pague Y\" / \"garanta para [mês]\").",
          "Avise a plataforma quando tiver volume: lançamento, safra grande, queima de estoque. Peça campanha com antecedência.",
          "Responda rápido no chat e cumpra o SLA: a plataforma corta da mídia paga quem tem reputação ruim.",
        ],
      },
      { tipo: "subtitulo", texto: "Como medir o resultado" },
      {
        tipo: "lista",
        itens: [
          "Em Análise Geral, veja o pico de vendas por produto durante a campanha.",
          "Combine com a plataforma um antes/depois: vendas na semana anterior × semana da campanha.",
        ],
      },
    ],
  },
  {
    id: "transportadoras-frete",
    numero: "16",
    titulo: "Transportadoras e tabela de frete",
    blocos: [
      {
        tipo: "p",
        texto:
          "O módulo de Transportadoras vive no painel admin (menu Entregas → Transportadoras). Quem cadastra é a equipe do Indústria 24h ou a operação da praça, não o seller. É esse cadastro que forma o leque de opções de frete que o comprador vê no checkout dos seus produtos.",
      },
      { tipo: "subtitulo", texto: "As três fontes de frete (convivem)" },
      {
        tipo: "tabela",
        cabecalho: ["Fonte", "Como calcula"],
        linhas: [
          [
            "Motor interno (%)",
            "Percentual por faixa de CEP configurado para a transportadora/loja. É o cálculo padrão.",
          ],
          [
            "Tabela de frete importada",
            "Valores fixos por faixa de CEP destino × faixa de peso, subidos por planilha. Usada antes do motor %.",
          ],
          ["Mercado Envios", "Cotação pela integração do Mercado Livre / Mercado Envios."],
        ],
        nota:
          "No checkout o sistema tenta a tabela importada primeiro; se ela não cobre o CEP, cai automaticamente no motor % da mesma transportadora. A opção de entrega nunca some.",
      },
      { tipo: "subtitulo", texto: "Cadastrar uma transportadora local (admin)" },
      {
        tipo: "p",
        texto:
          "Menu Entregas → Transportadoras → Cadastrar transportadora. Serve para incluir a transportadora ou o serviço de entrega da sua cidade (ex.: uma transportadora de Manaus, uma cooperativa de fretistas).",
      },
      {
        tipo: "campos",
        itens: [
          ["Nome", "Nome da transportadora, como o comprador vê no checkout."],
          ["Código referência", "Código interno para identificar/conciliar essa transportadora."],
          ["Peso mínimo / Peso máximo (KG)", "Faixa de peso que ela aceita transportar; fora dela, não é oferecida."],
          ["Preço mínimo / Preço máximo (R$)", "Piso e teto do valor de frete dessa transportadora."],
          [
            "Fator de cubagem",
            "Divisor que converte o volume (altura × largura × comprimento) em peso cobrado, para carga leve e volumosa. Ex.: fator 6.000 → 30×20×20 cm = 12.000 cm³ ÷ 6.000 = 2 kg cubados. Peça o fator à transportadora.",
          ],
          [
            "URL para acompanhamento",
            "Link de rastreio da transportadora, com o código do envio no fim, para o comprador acompanhar.",
          ],
          [
            "Categorias que carrega",
            "Marque as categorias de produto que essa transportadora transporta (Supermercado, Pet Shop, …). Ela só é oferecida para produtos dessas categorias.",
          ],
        ],
      },
      {
        tipo: "p",
        texto:
          "Salve. Depois, configure as faixas de CEP (motor %) e/ou suba a tabela de frete dessa transportadora. Há também upload em massa de transportadoras (CSV) quando forem várias.",
      },
      { tipo: "subtitulo", texto: "A planilha de tabela de frete" },
      {
        tipo: "p",
        texto:
          "Modelo (uma linha por cotação de referência). Colunas: CEP origem · CEP destino · Volume · Peso (KG) · Altura (CM) · Largura (CM) · Comprimento (CM) · Valor declarado R$ · Valor Atual Frete.",
      },
      {
        tipo: "tabela",
        cabecalho: ["CEP origem", "CEP destino", "Peso", "Dimensões", "Valor declarado", "Frete"],
        linhas: [["14095-240", "04549-000", "0,3 kg", "20×10×10 cm", "R$ 130,00", "R$ 27,80"]],
      },
      {
        tipo: "lista",
        itens: [
          "Preencha uma linha para cada combinação de CEP destino × peso que quer cobrir. O sistema agrupa em faixas.",
          "O CEP de origem é fixo por transportadora (o CD de onde ela retira).",
          "Salve o arquivo como CSV antes de subir: o upload aceita CSV, não XLSX. A planilha modelo serve só de referência das colunas.",
        ],
      },
      { tipo: "subtitulo", texto: "O que o seller controla" },
      {
        tipo: "lista",
        itens: [
          "Peso e medidas dos produtos (formulário de produto, tópico 05): é o que mais afeta o frete. Sem peso, o sistema usa 1 kg de placeholder e a cotação sai errada.",
          "Override da tabela de frete por loja: você enxerga as tabelas globais do admin e pode sobrescrever linha a linha. Para a mesma faixa de CEP + peso, o valor da sua loja vence o global.",
          "Modalidade de entrega do produto: ícone 🚚 (liga as opções de entrega) e ícone ✈ (libera para parceiro logístico) na lista de Produtos. Ver tópicos 05 e 10.",
          "Centro de distribuição correto (tópico 04): define a origem que a transportadora usa.",
        ],
      },
      {
        tipo: "aviso",
        titulo: "Estado do recurso",
        texto:
          "A tabela de frete importada é recente e pode ainda não estar ativada na sua praça. Confirme com a equipe do Indústria 24h se já está valendo antes de montar a planilha, e teste um pedido real depois de subir.",
      },
    ],
  },
];
