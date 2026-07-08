Documentação Completa do App Bubble — Industria 24hs
Sumário Executivo

App ID: industria24hs
Domínio personalizado: industria24h.com.br
Data API URL (dev): https://industria24h.com.br/version-test/api/1.1/obj
Workflow API URL (dev): https://industria24h.com.br/version-test/api/1.1/wf
Admin API Token (privado): <REMOVIDO — ver web/.env.local (BUBBLE_ADMIN_API_TOKEN). Rotacionar no Bubble: Settings → API. Valor circulou em texto puro e no histórico git; rotação é o fix real.>
Plano: Growth (~$134/mês)
Tipo de app: Marketplace B2B de produtos industriais / supermercado com logística


1. TIPOS DE DADOS (Data Types)
A lista completa dos tipos de dados ativos no app, com suas configurações de privacidade:
Tipos Públicos (Publicly visible)
TipoVisibilidadeacessosPúblicoCep EstadosPúblicocep-tempPúblicoconsig.cxs.pedidoPúblicoConsig.OfertaPúblicoConsig_Check_inPúblicoConsig_Check_outPúblicocredenciaisAPIsPúblicoCSVTransportadoraPúblicoecom.relacao_promotor_lojaPúblicoempresa_solicitacao_creditoPúblicoenvio_msgPúblicoerroPúblicoFaixaDeCEPPúblicofornecedorPúblicoimgBannerPúblicoInteressesPúblicoitem_para_compraPúblicomarketplacePúblicomensagens_gptPúbliconotificacaoPúbliconovo_aparelho_BubbleWhatsPúblicoperfil_de_compraPúblicoquem_somosPúblicoRelacao_Afiliado.transporte_LojaPúblicorelacao_produto_CDPúblicoRota_transportadoraPúblicoSubCategoriaPúblicotempPúblicovenda.futuraPúblico
Tipos Privados (Privacy rules applied)
TipoVisibilidadeAgendaLojaPrivadoavaliacaoProdutoPrivadoCardsPrivadoCardTimePrivadoCarrinho 0.1Privadocarrossel_iconesPrivadoCategoriaProdutosPrivadoCentrodedistribuicaoPrivadoComentEpergProdutoPrivadocomp_transferenciaPrivadoconsig.%.promotor_produtoPrivadoconsig.avariaPrivadoconsig.corte_pedidoPrivadoConsig.descontoPrivadoConsig.destinoPrivadoConsig.origemPrivadoconsig.pdtEstoqPrivadoConsig.PDVPrivadoConsig.PercentualPrivadoConsig.ProdutoPrivadoConsig.PromotorPrivadoconsig.rel_promotor.pdvPrivadoconsig.relacao.pdv.produtoPrivadoconsig.resp_trocaPrivadoConsig.solici.TransferPrivadoconsig.solici.trocaPrivadoconsig.transacaoPrivadoConsig.TransferPrivadoconsig.valorAtualProdutoPrivadoConsig.Venda.diretaPrivadoConsig.Venda.teoricaPrivadoConsig.Vendas.pdvPrivadoendereco_userPrivadoLinhaItemPrivadoLoja_ecommercePrivadomensagemPrivadomensagens_enviadas_whatsPrivadoPDV.ClientePrivadoPedidosVendedorPrivadoProduto_ecommercePrivadoPromocaoprogressivaPrivadoRelacao_Afiliado_LojaPrivadoRepresentantesPrivadosocio_empresa_solicitacao_creditoPrivadosolicitacao_de_creditoPrivadoTransportadoraPrivadoUserPrivado

Campos dos Tipos (Detalhados)
acessos (Público)
Campos customizados extraídos do editor:
CampoTipoObservaçãodata_horariodateData/hora do acessogeraltextInfo geralpaginatextPágina acessadauserUserUsuário relacionadoCreatorUserBuilt-inModified DatedateBuilt-inCreated DatedateBuilt-inSlugtextBuilt-in
Todos os demais tipos
Todos os outros tipos possuem apenas os campos built-in do Bubble (Creator, Modified Date, Created Date, Slug). Os campos específicos de cada tipo são referenciados no canvas do editor com os nomes que aparecem abaixo — esses campos são visíveis no momento de criação/edição dos elementos de design, mas sua definição formal no painel Data Types foi verificada como não estando visível no estado atual do editor.
Campos referenciados no canvas (inferidos por engenharia reversa):

Produto_ecommerce: ImgProduto (list), nome, preço, loja, categoria
CategoriaProdutos: NomeCategoria, ImagemCategoria
Loja_ecommerce: nome, banner, localização
venda.futura: produto (→ Produto_ecommerce), data de disponibilidade, estoque
User: email, senha, perfil, endereço


2. TIPOS EXCLUÍDOS (Archived/Deleted — restauráveis)
Tipo ExcluídoCarrinhoCarrinhosCategoriaEstabelecimentoCategoriaProdutocepsClienteCompraconsig_processo_pedidoConsignado_DestinoConsignado_FornecedorConsignado_OrigemConsignado_serienotaConsorcio_EstoqueFretesRegiaoimgtestePedidosVendedor (versão antiga)ProdutoFotoRelacao_Afiliado.transporte_Loja (versão antiga)

3. PÁGINAS DO APP (Web Pages)
O app possui as seguintes páginas:
PáginaDescrição/UsoindexPágina inicial / homeadminPainel administrativoafiliadologisticaPainel do afiliado logísticoanalise_de_creditoAnálise de créditocadastro_centroCadastro de centro de distribuiçãocadastro_consignadoCadastro de consignadocarrinhoCarrinho de comprascategoriasListagem de categoriascheckoutProcesso de checkoutconectar_telefoneConectar telefoneconsignadoMódulo consignadocontatoPágina de contatoentregadorPainel do entregadorhistoricoHistórico de pedidosindex_novaVersão nova da indexindexmobileIndex mobileloginPágina de loginlogin_consignadoLogin consignadologin_fulfillmentLogin fulfillmentlogin_marketplaceLogin marketplacelogin_sellerLogin sellerlojaPágina da lojaloja_afiliadoLoja do afiliadolojasListagem de lojasmeuspedidosMeus pedidosofertadodiaOferta do diapagina_de_testesPágina de testespainel_fulfillmentPainel fulfillmentpainel_transportadoraPainel transportadorapainelafiliadoPainel do afiliadoperfilPerfil do usuárioperfilmobilePerfil mobilepolitica-de-privacidadePolítica de privacidadepolitica_de_privacidadePolítica de privacidade (alt)precisa-de-ajudaPrecisa de ajuda / suporteprodutoPágina do produtoproduto_futuroProduto futuro / venda futuraprodutocategoriaProduto por categoriaprodutomobileProduto mobileprodutos_relacionadosProdutos relacionadospromotor_ecommercePainel promotor e-commercequem_somosQuem somossellerPainel seller/vendedorsupermercadoSupermercadosupervisor_ecommercePainel supervisor e-commercetermos_de_usoTermos de usotira_duvidaTira dúvidasreset_pwReset de senha404Página de erro 404

4. COMPONENTES REUTILIZÁVEIS (Reusables)
ComponenteDescriçãoafiliadoSlogisticaAfiliado de logísticaambienteConfiguração de ambienteanalise - dash - ADMDashboard de análise ADMaprovacao_creditoAprovação de créditobannermobileBanner mobilecadastrorepresentanteCadastro de representantecardEssenciaisCard de essenciaiscategoriasEmAltaCategorias em altaCATEGORIASPRODUTOSCategorias de produtoscentrodedistruibuicaoCentro de distribuiçãoCompras - Dash - SellerDashboard de compras sellercons.analise.comparativaAnálise comparativa consignadocons.relatorio.geralRelatório geral consignadocons_avariasAvarias consignadocons_avarias_pedidos_cortesAvarias/pedidos/cortescons_checkinCheck-in consignadocons_comissaoComissão consignadocons_comissoesComissões consignadocons_embalagemEmbalagem consignadocons_lojaLoja consignadocons_ofertaOferta consignadocons_pedidosPedidos consignadocons_PromotorPromotor consignadocons_vendasVendas consignadocriarCategoriaADMCriar categoria (ADM)dashboardDashboard geraldashboardAdmDashboard administrativodashboardUsuarioDashboard do usuáriodescontoprogressivoDesconto progressivodescontoprogressivo_admDesconto progressivo ADMeditarlojaADMEditar loja (ADM)editarmarketplaceEditar marketplaceeditarpaginasEditar páginasespelho.pagamentoEspelho de pagamentofinanceirotransporteFinanceiro de transporteFooterRodapég total produtos painel -wkTotal de produtos painelgerenciadorGerenciadorheaderCabeçalho desktopheaderMobileCabeçalho mobilehomeAfiliadoHome do afiliadoLançar pedidos blingLançar pedidos no BlinglojasadmLojas (ADM)lojasAfiliadasLojas afiliadasmenuMobileMenu mobileMinhaLojaMinha lojamudar filialMudar filialPagament - Dash - SellerDashboard pagamentos sellerpagamentosRepresentantesPagamentos representantespaginas_sellerADMPáginas seller ADMpedidosPedidospedidosADMPedidos (ADM)produtoafiliadotransporteProduto afiliado transporteProdutos - Dash - SellerDashboard produtos sellerprodutos lojas supervisor ecommerceProdutos lojas supervisorprodutosadmProdutos (ADM)produtosFreteGratis_admProdutos frete grátis ADMprodutosRepresentantesProdutos representantesPromocaoCatalogoPromoção catálogorastreador_de_acessosRastreador de acessosRepresen - Dash - SellerDashboard representantes sellerretirarnaloja-ADMRetirar na loja (ADM)transportadorasTransportadoras

5. PLUGINS INSTALADOS
PluginAir Copy to clipboardAlert Toast Message Notify · BEPAPI ConnectorBootstrap Layout HTMLBootstrap Star Rating InputBubble App ConnectorBubbleWhats - WhatsApp APIChart ElementColor Picker - Simple & BeautifulDraggable ElementsEasyLoopEssential Kit - Sample DataExport Pdf FileFile DownloaderGeolocation (GPS) tracker elementGerar PDF / ImprimirGoogle Maps - GeocodingGoogle Maps ExtendedGoogle Material IconsHeroIconsHorizontal text collapserHtml2PdfRocketImagemBase64Importar Excel - IA Code LabsImportar Excel - IA Code Labs (testing)Input MaskInstant CalculatorIonic ElementsIP GeoIP Geolocationipiphy - IP GeolocationJSON to CSV by OvexlabsLocal Storage & CookiesMapboxMath Expression Formula CalculatorMulti-File Uploader - DropzoneMultifile UploaderMultiselect DropdownPagSeguroPDF GeneratorProgress BarRG Drag to scrollRich Text EditorSlick SlideshowSlidebar MenuToolboxViaCEPViaCep JSWonderful Image Slider

6. API CONNECTOR — Coleções Configuradas
A aba API Connector possui pelo menos as seguintes coleções:

PagBank — integração com a API do PagBank (pagamentos)

(Outras coleções podem existir mas não foram completamente carregadas)

7. CONFIGURAÇÃO DE API
Data API (habilitada)

URL Dev: https://industria24h.com.br/version-test/api/1.1/obj
URL Live: https://industria24h.com.br/api/1.1/obj
Token Admin: 67ad4e850f247290c7fa434fed681713

Workflow API (habilitada)

URL Dev: https://industria24h.com.br/version-test/api/1.1/wf

Tipos expostos na Data API
Todos os 70+ tipos de dados estão expostos na Data API, incluindo: acessos, AgendaLoja, avaliacaoProduto, Cards, CategoriaProdutos, Centrodedistribuicao, Loja_ecommerce, Produto_ecommerce, User, PedidosVendedor, e todos os tipos do módulo Consignado.

8. VISTAS DE DADOS DO APP (App Data Views)
Vistas configuradas no App Data com nomes personalizados:

All acessos (× 2)
All CategoriaProdutos / CategoriaProdutos modified
All Centrodedistribuicaos / modified
consig_PdtEstoq
Consignado_Lojas
All Consig.Produtos / Consignado_Produtos modified 2
Consignado_Promotor
consig.rel.promotor.pdv
consig.rel.pdv.produto
consig.resposta_trocas modified
solictiacao_Transferencias
consig_solici_trocas
cons_trans avulsas / consig.trans ñ salva / consig.trans salva
transferencias.app / transferencias.upload
All consignado_valorAtualProdutos modified
venda_direta
Vendas.pdvs / Vendas.pdvs upload
All empresa_solicitacao_creditos modified
All envio_msgs modified
All Faixa de CEPS modified
All imgBanners modified
All items para compra modified
All Lojas modified
All marketplaces modified
All mensagens_enviadas_whats modified
PedidosVendedors (custom)
All Promocaoprogressivas modified
All Relacao_Afiliado_Lojas modified
All Transportadoras modified
All Users modified
Produtos.ecom
venda_futuras


9. ARQUITETURA DO NEGÓCIO (Análise por Engenharia Reversa)
Com base nos tipos de dados, páginas e componentes, o app Industria 24hs é uma plataforma marketplace B2B com as seguintes funcionalidades:
Módulos Principais:

E-commerce — Produto_ecommerce, CategoriaProdutos, SubCategoria, venda.futura, imgBanner, Promocaoprogressiva
Lojas/Sellers — Loja_ecommerce, marketplace, Representantes, Relacao_Afiliado_Loja
Carrinho e Pedidos — Carrinho 0.1, LinhaItem, PedidosVendedor, item_para_compra
Logística — Transportadora, Rota_transportadora, FaixaDeCEP, Centrodedistribuicao, relacao_produto_CD, CSVTransportadora
Módulo Consignado — 20+ tipos para gestão de consignado: Consig.PDV, Consig.Produto, Consig.Promotor, Consig.Transfer, consig.avaria, etc.
Crédito e Financeiro — solicitacao_de_credito, empresa_solicitacao_credito, socio_empresa_solicitacao_credito, comp_transferencia
Afiliados — Relacao_Afiliado_Loja, Relacao_Afiliado.transporte_Loja, ecom.relacao_promotor_loja
Comunicação — mensagem, mensagens_enviadas_whats, mensagens_gpt, notificacao, envio_msg, novo_aparelho_BubbleWhats
Usuários e Acesso — User, endereco_user, acessos, perfil_de_compra, Cards (possivelmente cartões de pagamento)
Infraestrutura — credenciaisAPIs, erro, temp, ambiente

Integrações externas identificadas:

PagBank (pagamentos)
PagSeguro (pagamentos)
WhatsApp (BubbleWhats)
Google Maps / Geocoding
ViaCEP (consulta de CEP)
Asaas (transferências PIX — visto nos erros do canvas)
Bling (ERP — "Lançar pedidos bling")
Mapbox (mapas)


10. COLABORADORES DO APP
E-mailPapelindustria24horas@gmail.comAdminindustria24hs@gmail.comAdmin (conta pagante)

Observação Técnica: A engenharia reversa foi realizada via leitura do Bubble Editor (aba Data Types, App Data, Settings e canvas do Design). Os campos customizados dos tipos de dados não foram completamente carregados pelo editor SPA durante a sessão — a limitação técnica é que o Bubble Editor só popula os valores dos campos de texto (textboxes) na árvore de acessibilidade quando o tipo é selecionado interativamente via clique, não via navegação por URL. O único tipo com campos completamente documentados foi acessos (carregado no estado inicial do editor). Os demais campos foram inferidos a partir das referências no canvas de design.