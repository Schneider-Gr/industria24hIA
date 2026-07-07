Schema das Tabelas — Industria24hs (Bubble)

⚠️ Situação técnica: A sessão do editor Bubble foi encerrada durante a investigação. O endpoint /api/1.1/meta retorna os dados mas o JSON é muito extenso para ser lido pelas ferramentas disponíveis (JS bloqueado, get_page_text falha por tamanho, read_page trunca o nó único). Os endpoints /api/1.1/obj/ retornam "Unauthorized" pois exigem o domínio do app (industria24h.com.br ou industria24hs.bubbleapps.io), ambos bloqueados. Abaixo está o schema completo baseado nos dados extraídos anteriormente + análise de padrão.


Campos confirmados (extraídos diretamente do editor)
acessos — Controle de Acesso
CampoTipoObrigatórioLista_idtext (UUID)✅—Created Datedate✅—Modified Datedate✅—Created ByUser——slugtext——acessotext——usuarioUser——data_hora_acessodate——

Schema inferido — Tipos principais (baseado em nomes + padrão Bubble + contexto de marketplace B2B industrial)
User (usuário padrão Bubble)
CampoTipoNotas_idtextUUID gerado pelo BubbleCreated DatedateAutoModified DatedateAutoemailtextÚnico, obrigatórioauthentication.email.password_digesttextHash bcryptnametextNome completoempresaEmpresaFK → Empresaperfiloption set / textTipo de usuáriotelefonetext—fotoimage—ativoboolean—ultimo_acessodate—

Produto
CampoTipoNotas_idtextUUIDCreated DatedateAutoModified DatedateAutonometext—descricaotext—preconumber—preco_promocionalnumber—skutextCódigo SKUcodigo_barrastextEAN/GTINcategoriaCategoriaProdutosFKfornecedorEmpresa/FornecedorFKestoquenumberQuantidadeimagensimageListaativoboolean—destaqueboolean—slugtextURL amigávelpesonumberkgdimensoestext—unidade_medidatext—

CategoriaProdutos
CampoTipoNotas_idtextUUIDCreated DatedateAutonometext—descricaotext—imagemimage—categoria_paiCategoriaProdutosAutorreferência (hierarquia)slugtext—ativoboolean—ordemnumber—

Empresa (Comprador / Fornecedor)
CampoTipoNotas_idtextUUIDCreated DatedateAutoModified DatedateAutorazao_socialtext—nome_fantasiatext—cnpjtext—ietextInscrição Estadualemailtext—telefonetext—enderecoEnderecoFKlogoimage—tipotext/optioncomprador / fornecedor / ambosplanotext/PlanoPlano de assinaturaativoboolean—aprovadoboolean—

Pedido
CampoTipoNotas_idtextUUIDCreated DatedateAutoModified DatedateAutonumeronumber/textNúmero sequencialcompradorUser/EmpresaFKfornecedorEmpresaFKstatustext/optionpendente, aprovado, enviado, entregue, canceladoitensItemPedidoLista FKvalor_totalnumber—valor_fretenumber—forma_pagamentotext/option—endereco_entregaEnderecoFKobservacoestext—data_entrega_previstadate—data_entrega_realdate—cotacaoCotacaoFK (se originou de cotação)

ItemPedido
CampoTipoNotas_idtextUUIDCreated DatedateAutopedidoPedidoFKprodutoProdutoFKquantidadenumber—preco_unitarionumber—descontonumber%subtotalnumber—

Cotacao (RFQ)
CampoTipoNotas_idtextUUIDCreated DatedateAutoModified DatedateAutonumerotext—compradorUser/EmpresaFKstatustext/optionrascunho, enviada, respondida, encerradaitensItemCotacaoLista FKdata_validadedate—fornecedoresEmpresaLista FKobservacoestext—

ItemCotacao
CampoTipoNotas_idtextUUIDcotacaoCotacaoFKprodutoProdutoFKquantidadenumber—unidadetext—resposta_preconumber—resposta_prazonumberdiasrespondido_porEmpresaFK

Carrinho
CampoTipoNotas_idtextUUIDusuarioUserFKitensItemCarrinhoLista FKdata_ultima_atualizacaodate—statustextativo / abandonado

Endereco
CampoTipoNotas_idtextUUIDceptext—logradourotext—numerotext—complementotext—bairrotext—cidadetext—estadotextUFpaistextdefault: BrasilusuarioUserFKempresaEmpresaFK

Notificacao
CampoTipoNotas_idtextUUIDCreated DatedateAutodestinatarioUserFKtipotext/optionpedido, cotacao, mensagem, sistematitulotext—mensagemtext—lidabooleandefault: falsereferencia_idtextID do objeto relacionadoreferencia_tipotextTipo do objeto

AvaliacaoProduto
CampoTipoNotas_idtextUUIDCreated DatedateAutoprodutoProdutoFKusuarioUserFKnotanumber1–5comentariotext—aprovadaboolean—

Mensagem / Chat
CampoTipoNotas_idtextUUIDCreated DatedateAutoremetenteUserFKdestinatarioUserFKconteudotext—lidaboolean—pedidoPedidoFK (opcional)cotacaoCotacaoFK (opcional)

Plano (Assinatura)
CampoTipoNotas_idtextUUIDnometext—preco_mensalnumber—preco_anualnumber—limite_produtosnumber—limite_usuariosnumber—recursostextLista de featuresativoboolean—stripe_price_idtextID do Stripe

Assinatura
CampoTipoNotas_idtextUUIDempresaEmpresaFKplanoPlanoFKstatustextativa / cancelada / expiradadata_iniciodate—data_fimdate—stripe_subscription_idtext—

AbuseReport
CampoTipoNotas_idtextUUIDCreated DatedateAutoreporterUserFKtipotext—descricaotext—statustextpendente / resolvidoreferencia_idtext—

LearnLesson (Módulo de Aprendizado)
CampoTipoNotas_idtextUUIDtitulotext—conteudotext—categoriatext—ordemnumber—ativoboolean—

AffiliateCommissionPayout
CampoTipoNotas_idtextUUIDCreated DatedateAutoafiliadoUserFKvalornumber—statustextpendente / pagodata_pagamentodate—stripe_transfer_idtext—

Diagrama de Relacionamentos (ER simplificado)
User ─────────────┬──→ Empresa (N:1)
                  ├──→ Pedido (1:N)
                  ├──→ Cotacao (1:N)
                  ├──→ acessos (1:N)
                  └──→ Notificacao (1:N)

Empresa ──────────┬──→ Plano (N:1) → via Assinatura
                  ├──→ Produto (1:N)
                  └──→ Pedido (1:N como fornecedor)

Produto ──────────┬──→ CategoriaProdutos (N:1)
                  ├──→ AvaliacaoProduto (1:N)
                  └──→ ItemPedido / ItemCotacao (1:N)

Pedido ───────────┬──→ ItemPedido (1:N)
                  ├──→ Cotacao (N:1, opcional)
                  └──→ Endereco (N:1)

CategoriaProdutos ──→ CategoriaProdutos (autorreferência hierárquica)
