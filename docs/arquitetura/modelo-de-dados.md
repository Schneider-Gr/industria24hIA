# Modelo de Dados Industria24

Fonte: `src/lib/supabase/database.types.ts` (21/09/2026). 87 tabelas em `public`; views omitidas; vínculos com `auth.users` aparecem como `USUARIO` (sem FK declarada no tipo gerado).

## Núcleo comercial

Loja vende produto; pedido é por loja e se abre em `linha_itens`, onde mora o split (vendedor, Industria24, afiliado). `repasses` registra cada transferência.

```mermaid
erDiagram
  USUARIO ||--o{ LOJAS : "owner_id"
  LOJAS ||--o{ PRODUTOS : "loja_id"
  CATEGORIAS ||--o{ SUBCATEGORIAS : "categoria_id"
  CATEGORIAS ||--o{ PRODUTOS : "categoria_id"
  SUBCATEGORIAS ||--o{ PRODUTOS : "subcategoria_id"
  TAXONOMIA_NOS ||--o{ TAXONOMIA_NOS : "parent_id"
  LOJAS ||--o{ PEDIDOS : "loja_id"
  USUARIO ||--o{ PEDIDOS : "cliente_id"
  PEDIDOS ||--|{ LINHA_ITENS : "pedido_id"
  PRODUTOS ||--o{ LINHA_ITENS : "produto_id"
  CUPONS ||--o{ LINHA_ITENS : "cupom_id"
  CUPONS ||--o{ CUPOM_USOS : "cupom_id"
  CUPONS ||--o{ CUPOM_REGRAS : "cupom_id"
  PEDIDOS ||--o{ CUPOM_USOS : "pedido_id"
  LOJAS ||--o{ CUPONS : "loja_id"
  PEDIDOS ||--o{ REPASSES : "pedido_id"
  LOJAS ||--o{ REPASSES : "loja_id"
  LOJAS ||--o{ AFILIACOES : "loja_id"
  PRODUTOS ||--o{ AFILIACOES : "produto_id"
  AFILIACOES ||--o{ AFILIADO_VITRINE_PRODUTOS : "afiliacao_id"
  AFILIADO_VITRINES ||--o{ AFILIADO_VITRINE_PRODUTOS : "vitrine_id"
  PEDIDOS ||--o{ DISPUTAS : "pedido_id"
  LINHA_ITENS ||--o{ DISPUTAS : "linha_item_id"
  CONVERSAS ||--o{ DISPUTAS : "conversa_id"
  DISPUTAS ||--o{ DISPUTA_FOTOS : "disputa_id"
  DISPUTAS ||--o{ DISPUTA_MENSAGENS_MEDIACAO : "disputa_id"
  PRODUTOS ||--o{ PRODUTO_IMAGENS : "produto_id"
  PRODUTOS ||--o{ AVALIACOES_PRODUTO : "produto_id"
  PRODUTOS ||--o| PRODUTO_CURADORIA : "produto_id"

  LOJAS {
    uuid id PK
    uuid owner_id
    string nome
    string cnpj
    string situacao
    string asaas_wallet_id
    string chave_pix
    numeric valor_pedido_minimo
  }
  PRODUTOS {
    uuid id PK
    uuid loja_id FK
    uuid categoria_id FK
    uuid subcategoria_id FK
    string nome
    numeric valor
    int estoque_atual
    int quantidade_minima
    string status_produto
    bool permite_afiliacao
    numeric porcentagem_afiliado
  }
  CATEGORIAS {
    uuid id PK
    string nome
    numeric comissao_pct
  }
  TAXONOMIA_NOS {
    uuid id PK
    uuid parent_id FK
    string caminho
    int nivel
    string origem
    numeric comissao_pct
  }
  PEDIDOS {
    uuid id PK
    uuid loja_id FK
    uuid cliente_id
    string id_venda
    string status_pedido
    numeric valor_pedido
    string asaas_cobranca_id
    string forma_pagamento
    bool split_nativo_aplicado
  }
  LINHA_ITENS {
    uuid id PK
    uuid pedido_id FK
    uuid produto_id FK
    uuid afiliado_id
    uuid cupom_id FK
    int quantidade
    numeric valor
    numeric repasse_vendedor
    numeric repasse_ind
    numeric repasse_afiliado
    bool pago
    bool entregue
  }
  REPASSES {
    uuid id PK
    uuid pedido_id FK
    uuid loja_id FK
    uuid afiliado_id
    string destino
    numeric valor
    string status
  }
  AFILIACOES {
    uuid id PK
    uuid loja_id FK
    uuid produto_id FK
    uuid afiliado_id
    string tipo
    numeric porcentagem
    string status
  }
  CUPONS {
    uuid id PK
    uuid loja_id FK
    string codigo
    string dono
    int limite_por_cliente
  }
  DISPUTAS {
    uuid id PK
    uuid pedido_id FK
    uuid linha_item_id FK
    uuid conversa_id FK
    string status
    string decisao
    timestamp sla_loja_vence_em
  }
```

## Compra coletiva, venda futura e leilão

Coletiva agrega participações até a meta; cada participação vira um pedido. Leilão reverso liga fabricantes por categoria.

```mermaid
erDiagram
  PRODUTOS ||--o{ COLETIVA_REGRAS : "produto_id"
  COLETIVA_REGRAS ||--o{ COMPRAS_COLETIVAS : "regra_id"
  PRODUTOS ||--o{ COMPRAS_COLETIVAS : "produto_id"
  LOJAS ||--o{ COMPRAS_COLETIVAS : "loja_id"
  COMPRAS_COLETIVAS ||--o{ COLETIVA_PARTICIPACOES : "coletiva_id"
  COMPRAS_COLETIVAS ||--o{ COLETIVA_EVENTOS : "coletiva_id"
  PEDIDOS ||--o| COLETIVA_PARTICIPACOES : "pedido_id"
  PRODUTOS ||--o{ VENDAS_FUTURAS : "produto_id"
  VENDAS_FUTURAS ||--o{ LINHA_ITENS : "venda_futura_id"
  PRODUTOS ||--o{ PROMOCOES_PROGRESSIVAS : "produto_id"
  PRODUTOS ||--o{ PRODUTOS_PATROCINADOS : "produto_id"
  CATEGORIAS ||--o{ LEILOES_FABRICANTES : "categoria_id"
  LEILOES_FABRICANTES ||--o{ LEILAO_LANCES : "leilao_id"
  LOJAS ||--o{ LEILAO_LANCES : "loja_id"

  COMPRAS_COLETIVAS {
    uuid id PK
    uuid produto_id FK
    uuid loja_id FK
    uuid regra_id FK
    uuid criador_id
    int meta_qtd
    int qtd_atual
    int min_participantes
    numeric preco_base
    numeric valor_unitario
    json lotes
    string status
  }
  COLETIVA_PARTICIPACOES {
    uuid id PK
    uuid coletiva_id FK
    uuid pedido_id FK
    uuid user_id
    int quantidade
  }
  VENDAS_FUTURAS {
    uuid id PK
    uuid produto_id FK
    numeric valor
    int estoque
    date previsao
  }
```

## Logística e estoque

Estoque por centro de distribuição e endereço; frete por faixa de CEP e transportadora; entrega própria em `corridas` com lances de parceiros.

```mermaid
erDiagram
  LOJAS ||--o{ CENTROS_DISTRIBUICAO : "loja_id"
  CENTROS_DISTRIBUICAO ||--o{ ESTOQUE_ENDERECOS : "centro_id"
  CENTROS_DISTRIBUICAO ||--o{ ESTOQUE_SALDOS : "centro_id"
  PRODUTOS ||--o{ ESTOQUE_SALDOS : "produto_id"
  ESTOQUE_ENDERECOS ||--o{ ESTOQUE_SALDOS_ENDERECO : "endereco_id"
  CENTROS_DISTRIBUICAO ||--o{ ESTOQUE_MOVIMENTOS : "centro_id"
  PRODUTOS ||--o{ ESTOQUE_RESERVAS : "produto_id"
  PEDIDOS ||--o{ ESTOQUE_RESERVAS : "pedido_id"
  PRODUTOS ||--o{ PRODUTO_CENTROS : "produto_id"
  CENTROS_DISTRIBUICAO ||--o{ PRODUTO_CENTROS : "centro_id"
  LOJAS ||--o{ TRANSPORTADORAS : "loja_id"
  TRANSPORTADORAS ||--o{ FAIXAS_CEP : "transportadora_id"
  TRANSPORTADORAS ||--o{ TRANSPORTADORA_FAIXAS_FRETE : "transportadora_id"
  FAIXAS_CEP ||--o{ PRODUTO_FAIXAS_CEP : "faixa_cep_id"
  PRODUTOS ||--o{ PRODUTO_FAIXAS_CEP : "produto_id"
  LINHA_ITENS ||--o| ENTREGAS : "linha_item_id"
  PEDIDOS ||--o{ CORRIDAS : "pedido_id"
  PARCEIROS_LOGISTICOS ||--o{ CORRIDAS : "parceiro_id"
  CORRIDAS ||--o{ CORRIDA_LANCES : "corrida_id"
  PARCEIROS_LOGISTICOS ||--o{ CORRIDA_LANCES : "parceiro_id"
  CORRIDAS ||--o{ CORRIDA_POSICOES : "corrida_id"
  CORRIDAS ||--o{ CORRIDA_AVALIACOES : "corrida_id"
  CORRIDAS ||--o{ LOTES_CONSOLIDACAO : "corrida_id"
  LOTES_CONSOLIDACAO ||--o{ LOTE_PEDIDOS : "lote_id"
  PEDIDOS ||--o{ LOTE_PEDIDOS : "pedido_id"
  PEDIDOS ||--o{ ROTAS : "pedido_id"

  ESTOQUE_SALDOS {
    uuid centro_id PK
    uuid produto_id PK
    int quantidade
  }
  CORRIDAS {
    uuid id PK
    uuid pedido_id FK
    uuid parceiro_id FK
    string modo
    string status
    numeric peso_kg
    numeric preco_final
    numeric comissao_pct
  }
  PARCEIROS_LOGISTICOS {
    uuid id PK
    uuid user_id
    string tipo
    numeric capacidade_kg
    string status
  }
```

## Atendimento, IA e API de parceiros

Bot do WhatsApp gera leads; conversas entre comprador e loja alimentam disputas; `api_keys` sustenta o mcp-server.

```mermaid
erDiagram
  BOT_CONVERSAS ||--o{ BOT_MENSAGENS : "conversa_id"
  BOT_CONVERSAS ||--o{ INCIDENTES_ATENDIMENTO : "conversa_id"
  BOT_CONVERSAS ||--o{ LEADS : "conversa_id"
  LOJAS ||--o{ LEADS : "loja_id"
  ADMINS ||--o{ LEADS : "responsavel_id"
  LEADS ||--o{ LEAD_INTERACOES : "lead_id"
  LEADS ||--o{ LEAD_FOLLOWUPS : "lead_id"
  LOJAS ||--o{ CONVERSAS : "loja_id"
  PEDIDOS ||--o{ CONVERSAS : "pedido_id"
  CONVERSAS ||--o{ MENSAGENS : "conversa_id"
  PRODUTOS ||--o{ PRODUTO_SUGESTOES_IA : "produto_id"
  LOJAS ||--o{ LOJA_AVISOS_CURADORIA : "loja_id"
  API_PARTNERS ||--o{ API_KEYS : "partner_id"
  LOJAS ||--o{ API_KEYS : "loja_id"
  API_KEYS ||--o{ API_AUDIT_LOG : "key_id"
  LOJAS ||--o{ SOLICITACOES_CREDITO : "loja_id"
  SOLICITACOES_CREDITO ||--o{ SOCIOS_SOLICITACAO_CREDITO : "solicitacao_id"
```
