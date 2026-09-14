// Tour guiado replicando o vídeo "Visão Geral da Plataforma" do Bubble
// (industria24h.com.br/version-test/seller — assistido em 2026-07-15).
// Lógica de navegação observada no vídeo: o apresentador vai de Produtos →
// Análise Geral (aponta os cards de Valor Total/Produtos Vendidos e as
// colunas Status/Repasse Ind da tabela de vendas) → Centro de distribuição
// (lista de centros → formulário de novo centro com CEP/mapa) → Pedidos
// (visão geral com filtro de status). Sem narração capturada (sem chave
// Whisper configurada neste projeto), então os textos abaixo descrevem o
// que a tela mostra, não transcrevem fala — atualizar se a chave for
// configurada e a voz off puder ser transcrita literalmente.
//
// `audio` é o nome do arquivo em `public/tour/`, narrado na voz clonada da
// dona. Mudou o texto de um passo, regrave o arquivo daquele passo (skill
// `voz`, textos-fonte em `voice-clone-xtts/tour-seller/`), senão a voz passa a
// descrever uma tela que mudou.
export const PASSOS = [
  {
    href: "/seller",
    titulo: "Bem-vindo ao painel do lojista",
    audio: "dashboard",
    texto:
      "Este é o Dashboard: visão rápida de vendas do mês, comparação com o mês anterior e top produtos. É a tela inicial sempre que você entra.",
  },
  {
    href: "/seller/analise-geral",
    titulo: "Análise Geral",
    audio: "analise-geral",
    texto:
      "Aqui você vê o valor total vendido, quantos produtos foram vendidos e a variação percentual em relação ao período anterior — os cards verde/vermelho no topo.",
  },
  {
    href: "/seller/analise-geral",
    titulo: "Tabela de vendas",
    audio: "tabela-vendas",
    texto:
      "Abaixo dos cards fica a lista de vendas: cliente, item, status do pagamento e o Repasse Ind — o valor que a Indústria 24h repassa pra sua loja depois da comissão.",
  },
  {
    href: "/seller/produtos",
    titulo: "Produtos",
    audio: "produtos",
    texto:
      'Cadastre e edite seu catálogo aqui. Em "Cadastrar Novo" você preenche nome, preço e descrição — e o botão "IA: gerar imagem da descrição" cria a foto de catálogo do produto automaticamente a partir do texto.',
  },
  {
    href: "/seller/centros",
    titulo: "Centro de distribuição",
    audio: "centros",
    texto:
      "Cadastre os pontos de onde seus produtos são despachados. Cada centro tem nome e uma localização em texto livre: esta tela não pede CEP, então o que você escreve aqui não entra no cálculo de frete.",
  },
  {
    href: "/seller/pedidos",
    titulo: "Pedidos",
    audio: "pedidos",
    texto:
      "Visão geral dos pedidos recebidos: cliente, quantidade, data e status (Pago, Em separação, etc). Use os filtros pra achar um pedido específico rápido.",
  },
  {
    href: "/seller/minha-loja",
    titulo: "Minha Loja",
    audio: "minha-loja",
    texto:
      'Edite os dados cadastrais, chave PIX e configurações da sua loja. É a mesma tela que o menu "Dados" abre.',
  },
] as const;

export type PassoTour = (typeof PASSOS)[number];
