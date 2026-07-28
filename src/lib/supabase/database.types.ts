export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      aceites_termos: {
        Row: {
          aceito_em: string
          id: string
          slug: string
          user_id: string
          versao: string | null
        }
        Insert: {
          aceito_em?: string
          id?: string
          slug: string
          user_id: string
          versao?: string | null
        }
        Update: {
          aceito_em?: string
          id?: string
          slug?: string
          user_id?: string
          versao?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "aceites_termos_slug_fkey"
            columns: ["slug"]
            isOneToOne: false
            referencedRelation: "paginas_cms"
            referencedColumns: ["slug"]
          },
        ]
      }
      acessos: {
        Row: {
          created_at: string
          data_horario: string | null
          geral: string | null
          id: string
          modified_at: string
          pagina: string | null
          slug: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          data_horario?: string | null
          geral?: string | null
          id?: string
          modified_at?: string
          pagina?: string | null
          slug?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          data_horario?: string | null
          geral?: string | null
          id?: string
          modified_at?: string
          pagina?: string | null
          slug?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      admin_rate_limit: {
        Row: {
          acao: string
          admin_id: string
          contagem: number
          janela: string
        }
        Insert: {
          acao: string
          admin_id: string
          contagem?: number
          janela: string
        }
        Update: {
          acao?: string
          admin_id?: string
          contagem?: number
          janela?: string
        }
        Relationships: []
      }
      admins: {
        Row: {
          created_at: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          role?: string
          user_id: string
        }
        Update: {
          created_at?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      afiliacoes: {
        Row: {
          afiliado_id: string | null
          bubble_id: string | null
          created_at: string
          id: string
          identificador: string | null
          loja_id: string | null
          porcentagem: number
          produto_id: string | null
          status: string
          termos_aceitos_em: string | null
          termos_versao: string | null
          tipo: string
        }
        Insert: {
          afiliado_id?: string | null
          bubble_id?: string | null
          created_at?: string
          id?: string
          identificador?: string | null
          loja_id?: string | null
          porcentagem: number
          produto_id?: string | null
          status?: string
          termos_aceitos_em?: string | null
          termos_versao?: string | null
          tipo?: string
        }
        Update: {
          afiliado_id?: string | null
          bubble_id?: string | null
          created_at?: string
          id?: string
          identificador?: string | null
          loja_id?: string | null
          porcentagem?: number
          produto_id?: string | null
          status?: string
          termos_aceitos_em?: string | null
          termos_versao?: string | null
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "afiliacoes_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "lojas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "afiliacoes_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "lojas_vitrine"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "afiliacoes_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
        ]
      }
      api_audit_log: {
        Row: {
          criado_em: string
          erro: string | null
          id: string
          ip: string | null
          key_id: string | null
          loja_id: string | null
          ok: boolean
          params_resumo: Json | null
          tool: string
        }
        Insert: {
          criado_em?: string
          erro?: string | null
          id?: string
          ip?: string | null
          key_id?: string | null
          loja_id?: string | null
          ok: boolean
          params_resumo?: Json | null
          tool: string
        }
        Update: {
          criado_em?: string
          erro?: string | null
          id?: string
          ip?: string | null
          key_id?: string | null
          loja_id?: string | null
          ok?: boolean
          params_resumo?: Json | null
          tool?: string
        }
        Relationships: [
          {
            foreignKeyName: "api_audit_log_key_id_fkey"
            columns: ["key_id"]
            isOneToOne: false
            referencedRelation: "api_keys"
            referencedColumns: ["id"]
          },
        ]
      }
      api_keys: {
        Row: {
          aprovada_em: string | null
          aprovada_por: string | null
          criado_em: string
          escopo: string
          expira_em: string | null
          id: string
          loja_id: string
          partner_id: string
          prefixo: string
          revogada_em: string | null
          token_hash: string
          ultimo_uso: string | null
        }
        Insert: {
          aprovada_em?: string | null
          aprovada_por?: string | null
          criado_em?: string
          escopo: string
          expira_em?: string | null
          id?: string
          loja_id: string
          partner_id: string
          prefixo: string
          revogada_em?: string | null
          token_hash: string
          ultimo_uso?: string | null
        }
        Update: {
          aprovada_em?: string | null
          aprovada_por?: string | null
          criado_em?: string
          escopo?: string
          expira_em?: string | null
          id?: string
          loja_id?: string
          partner_id?: string
          prefixo?: string
          revogada_em?: string | null
          token_hash?: string
          ultimo_uso?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "api_keys_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "lojas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "api_keys_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "lojas_vitrine"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "api_keys_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "api_partners"
            referencedColumns: ["id"]
          },
        ]
      }
      api_partners: {
        Row: {
          ativo: boolean
          contato: string | null
          criado_em: string
          id: string
          nome: string
        }
        Insert: {
          ativo?: boolean
          contato?: string | null
          criado_em?: string
          id?: string
          nome: string
        }
        Update: {
          ativo?: boolean
          contato?: string | null
          criado_em?: string
          id?: string
          nome?: string
        }
        Relationships: []
      }
      asaas_clientes: {
        Row: {
          cpf_cnpj: string
          created_at: string
          customer_id: string
          user_id: string
        }
        Insert: {
          cpf_cnpj: string
          created_at?: string
          customer_id: string
          user_id: string
        }
        Update: {
          cpf_cnpj?: string
          created_at?: string
          customer_id?: string
          user_id?: string
        }
        Relationships: []
      }
      auditoria_eventos: {
        Row: {
          acao: string
          ator_id: string | null
          ator_papel: string
          criado_em: string
          dados_antes: Json | null
          dados_depois: Json | null
          id: string
          registro_id: string | null
          tabela: string
        }
        Insert: {
          acao: string
          ator_id?: string | null
          ator_papel?: string
          criado_em?: string
          dados_antes?: Json | null
          dados_depois?: Json | null
          id?: string
          registro_id?: string | null
          tabela: string
        }
        Update: {
          acao?: string
          ator_id?: string | null
          ator_papel?: string
          criado_em?: string
          dados_antes?: Json | null
          dados_depois?: Json | null
          id?: string
          registro_id?: string | null
          tabela?: string
        }
        Relationships: []
      }
      bot_conversas: {
        Row: {
          canal: string
          created_at: string
          id: string
          identificado_em: string | null
          jira_issue_key: string | null
          status: string
          telefone: string | null
          updated_at: string
          usuario_id: string | null
        }
        Insert: {
          canal: string
          created_at?: string
          id?: string
          identificado_em?: string | null
          jira_issue_key?: string | null
          status?: string
          telefone?: string | null
          updated_at?: string
          usuario_id?: string | null
        }
        Update: {
          canal?: string
          created_at?: string
          id?: string
          identificado_em?: string | null
          jira_issue_key?: string | null
          status?: string
          telefone?: string | null
          updated_at?: string
          usuario_id?: string | null
        }
        Relationships: []
      }
      bot_mensagens: {
        Row: {
          conteudo: string
          conversa_id: string
          created_at: string
          id: string
          remetente: string
        }
        Insert: {
          conteudo: string
          conversa_id: string
          created_at?: string
          id?: string
          remetente: string
        }
        Update: {
          conteudo?: string
          conversa_id?: string
          created_at?: string
          id?: string
          remetente?: string
        }
        Relationships: [
          {
            foreignKeyName: "bot_mensagens_conversa_id_fkey"
            columns: ["conversa_id"]
            isOneToOne: false
            referencedRelation: "bot_conversas"
            referencedColumns: ["id"]
          },
        ]
      }
      categorias: {
        Row: {
          bubble_id: string | null
          id: string
          nome: string
        }
        Insert: {
          bubble_id?: string | null
          id?: string
          nome: string
        }
        Update: {
          bubble_id?: string | null
          id?: string
          nome?: string
        }
        Relationships: []
      }
      centros_distribuicao: {
        Row: {
          bubble_id: string | null
          created_at: string
          id: string
          localizacao: string | null
          loja_id: string
          nome: string
          status: string
        }
        Insert: {
          bubble_id?: string | null
          created_at?: string
          id?: string
          localizacao?: string | null
          loja_id: string
          nome: string
          status?: string
        }
        Update: {
          bubble_id?: string | null
          created_at?: string
          id?: string
          localizacao?: string | null
          loja_id?: string
          nome?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "centros_distribuicao_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "lojas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "centros_distribuicao_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "lojas_vitrine"
            referencedColumns: ["id"]
          },
        ]
      }
      coletiva_eventos: {
        Row: {
          coletiva_id: string
          created_at: string
          id: string
          notificado_em: string | null
          payload: Json
          tipo: string
        }
        Insert: {
          coletiva_id: string
          created_at?: string
          id?: string
          notificado_em?: string | null
          payload?: Json
          tipo: string
        }
        Update: {
          coletiva_id?: string
          created_at?: string
          id?: string
          notificado_em?: string | null
          payload?: Json
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "coletiva_eventos_coletiva_id_fkey"
            columns: ["coletiva_id"]
            isOneToOne: false
            referencedRelation: "compras_coletivas"
            referencedColumns: ["id"]
          },
        ]
      }
      coletiva_participacoes: {
        Row: {
          coletiva_id: string
          created_at: string
          id: string
          pedido_id: string | null
          quantidade: number
          user_id: string
        }
        Insert: {
          coletiva_id: string
          created_at?: string
          id?: string
          pedido_id?: string | null
          quantidade: number
          user_id: string
        }
        Update: {
          coletiva_id?: string
          created_at?: string
          id?: string
          pedido_id?: string | null
          quantidade?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coletiva_participacoes_coletiva_id_fkey"
            columns: ["coletiva_id"]
            isOneToOne: false
            referencedRelation: "compras_coletivas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coletiva_participacoes_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "logistica_pedidos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coletiva_participacoes_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coletiva_participacoes_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos_cliente"
            referencedColumns: ["id"]
          },
        ]
      }
      coletiva_regras: {
        Row: {
          ativo: boolean
          created_at: string
          frete_conjunto: boolean
          id: string
          lotes: Json
          max_participantes: number | null
          meta_qtd: number | null
          min_participantes: number
          prazo_dias: number
          prazo_pagamento_horas: number
          produto_id: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          frete_conjunto?: boolean
          id?: string
          lotes?: Json
          max_participantes?: number | null
          meta_qtd?: number | null
          min_participantes?: number
          prazo_dias?: number
          prazo_pagamento_horas?: number
          produto_id: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          frete_conjunto?: boolean
          id?: string
          lotes?: Json
          max_participantes?: number | null
          meta_qtd?: number | null
          min_participantes?: number
          prazo_dias?: number
          prazo_pagamento_horas?: number
          produto_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "coletiva_regras_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: true
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
        ]
      }
      compras_coletivas: {
        Row: {
          created_at: string
          criador_id: string
          entrega_bairro: string | null
          entrega_cep: string | null
          entrega_cidade: string | null
          entrega_complemento: string | null
          entrega_numero: string | null
          entrega_rua: string | null
          fechada_em: string | null
          frete_conjunto: boolean
          id: string
          loja_id: string
          lotes: Json
          max_participantes: number | null
          meta_qtd: number
          min_participantes: number
          pagamento_ate: string | null
          prazo: string
          preco_base: number
          produto_id: string
          qtd_atual: number
          regra_id: string | null
          status: string
          valor_unitario: number
        }
        Insert: {
          created_at?: string
          criador_id: string
          entrega_bairro?: string | null
          entrega_cep?: string | null
          entrega_cidade?: string | null
          entrega_complemento?: string | null
          entrega_numero?: string | null
          entrega_rua?: string | null
          fechada_em?: string | null
          frete_conjunto?: boolean
          id?: string
          loja_id: string
          lotes?: Json
          max_participantes?: number | null
          meta_qtd: number
          min_participantes?: number
          pagamento_ate?: string | null
          prazo: string
          preco_base: number
          produto_id: string
          qtd_atual?: number
          regra_id?: string | null
          status?: string
          valor_unitario: number
        }
        Update: {
          created_at?: string
          criador_id?: string
          entrega_bairro?: string | null
          entrega_cep?: string | null
          entrega_cidade?: string | null
          entrega_complemento?: string | null
          entrega_numero?: string | null
          entrega_rua?: string | null
          fechada_em?: string | null
          frete_conjunto?: boolean
          id?: string
          loja_id?: string
          lotes?: Json
          max_participantes?: number | null
          meta_qtd?: number
          min_participantes?: number
          pagamento_ate?: string | null
          prazo?: string
          preco_base?: number
          produto_id?: string
          qtd_atual?: number
          regra_id?: string | null
          status?: string
          valor_unitario?: number
        }
        Relationships: [
          {
            foreignKeyName: "compras_coletivas_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "lojas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compras_coletivas_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "lojas_vitrine"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compras_coletivas_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compras_coletivas_regra_id_fkey"
            columns: ["regra_id"]
            isOneToOne: false
            referencedRelation: "coletiva_regras"
            referencedColumns: ["id"]
          },
        ]
      }
      conversas: {
        Row: {
          coletiva_id: string | null
          comprador_id: string
          comprador_nome: string | null
          created_at: string
          id: string
          loja_id: string
          produto_id: string | null
          updated_at: string
        }
        Insert: {
          coletiva_id?: string | null
          comprador_id: string
          comprador_nome?: string | null
          created_at?: string
          id?: string
          loja_id: string
          produto_id?: string | null
          updated_at?: string
        }
        Update: {
          coletiva_id?: string | null
          comprador_id?: string
          comprador_nome?: string | null
          created_at?: string
          id?: string
          loja_id?: string
          produto_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversas_coletiva_id_fkey"
            columns: ["coletiva_id"]
            isOneToOne: false
            referencedRelation: "compras_coletivas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversas_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "lojas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversas_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "lojas_vitrine"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversas_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
        ]
      }
      corrida_avaliacoes: {
        Row: {
          avaliador_id: string
          comentario: string | null
          corrida_id: string
          criado_em: string
          nota: number
        }
        Insert: {
          avaliador_id: string
          comentario?: string | null
          corrida_id: string
          criado_em?: string
          nota: number
        }
        Update: {
          avaliador_id?: string
          comentario?: string | null
          corrida_id?: string
          criado_em?: string
          nota?: number
        }
        Relationships: [
          {
            foreignKeyName: "corrida_avaliacoes_corrida_id_fkey"
            columns: ["corrida_id"]
            isOneToOne: true
            referencedRelation: "corridas"
            referencedColumns: ["id"]
          },
        ]
      }
      corrida_lances: {
        Row: {
          corrida_id: string
          criado_em: string
          id: string
          parceiro_id: string
          prazo: string | null
          valor: number
        }
        Insert: {
          corrida_id: string
          criado_em?: string
          id?: string
          parceiro_id: string
          prazo?: string | null
          valor: number
        }
        Update: {
          corrida_id?: string
          criado_em?: string
          id?: string
          parceiro_id?: string
          prazo?: string | null
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "corrida_lances_corrida_id_fkey"
            columns: ["corrida_id"]
            isOneToOne: false
            referencedRelation: "corridas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "corrida_lances_parceiro_id_fkey"
            columns: ["parceiro_id"]
            isOneToOne: false
            referencedRelation: "parceiros_logisticos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "corrida_lances_parceiro_id_fkey"
            columns: ["parceiro_id"]
            isOneToOne: false
            referencedRelation: "parceiros_publicos"
            referencedColumns: ["id"]
          },
        ]
      }
      corrida_posicoes: {
        Row: {
          corrida_id: string
          criado_em: string
          id: number
          lat: number
          lng: number
        }
        Insert: {
          corrida_id: string
          criado_em?: string
          id?: never
          lat: number
          lng: number
        }
        Update: {
          corrida_id?: string
          criado_em?: string
          id?: never
          lat?: number
          lng?: number
        }
        Relationships: [
          {
            foreignKeyName: "corrida_posicoes_corrida_id_fkey"
            columns: ["corrida_id"]
            isOneToOne: false
            referencedRelation: "corridas"
            referencedColumns: ["id"]
          },
        ]
      }
      corridas: {
        Row: {
          afiliado_exclusivo_id: string | null
          assinatura_url: string | null
          comissao_pct: number
          comissao_valor: number | null
          criado_em: string
          descricao_carga: string | null
          destino_cep: string
          destino_endereco: string
          distancia_m: number | null
          duracao_s: number | null
          exclusividade_fim: string | null
          foto_entrega_url: string | null
          id: string
          janela_fim: string
          janela_inicio: string
          link_mapa: string | null
          modo: string
          origem_cep: string
          origem_endereco: string
          parceiro_id: string | null
          pedido_id: string | null
          peso_kg: number
          preco_final: number | null
          preco_sugerido: number | null
          solicitante_id: string
          status: string
          urgencia: string
          valor_parceiro: number | null
          volume_m3: number | null
        }
        Insert: {
          afiliado_exclusivo_id?: string | null
          assinatura_url?: string | null
          comissao_pct?: number
          comissao_valor?: number | null
          criado_em?: string
          descricao_carga?: string | null
          destino_cep: string
          destino_endereco: string
          distancia_m?: number | null
          duracao_s?: number | null
          exclusividade_fim?: string | null
          foto_entrega_url?: string | null
          id?: string
          janela_fim: string
          janela_inicio: string
          link_mapa?: string | null
          modo?: string
          origem_cep: string
          origem_endereco: string
          parceiro_id?: string | null
          pedido_id?: string | null
          peso_kg: number
          preco_final?: number | null
          preco_sugerido?: number | null
          solicitante_id: string
          status?: string
          urgencia?: string
          valor_parceiro?: number | null
          volume_m3?: number | null
        }
        Update: {
          afiliado_exclusivo_id?: string | null
          assinatura_url?: string | null
          comissao_pct?: number
          comissao_valor?: number | null
          criado_em?: string
          descricao_carga?: string | null
          destino_cep?: string
          destino_endereco?: string
          distancia_m?: number | null
          duracao_s?: number | null
          exclusividade_fim?: string | null
          foto_entrega_url?: string | null
          id?: string
          janela_fim?: string
          janela_inicio?: string
          link_mapa?: string | null
          modo?: string
          origem_cep?: string
          origem_endereco?: string
          parceiro_id?: string | null
          pedido_id?: string | null
          peso_kg?: number
          preco_final?: number | null
          preco_sugerido?: number | null
          solicitante_id?: string
          status?: string
          urgencia?: string
          valor_parceiro?: number | null
          volume_m3?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "corridas_parceiro_id_fkey"
            columns: ["parceiro_id"]
            isOneToOne: false
            referencedRelation: "parceiros_logisticos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "corridas_parceiro_id_fkey"
            columns: ["parceiro_id"]
            isOneToOne: false
            referencedRelation: "parceiros_publicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "corridas_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "logistica_pedidos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "corridas_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "corridas_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos_cliente"
            referencedColumns: ["id"]
          },
        ]
      }
      entregas: {
        Row: {
          atualizado_em: string
          envio_correto: boolean
          linha_item_id: string
          rastreio: string | null
          status: string
        }
        Insert: {
          atualizado_em?: string
          envio_correto?: boolean
          linha_item_id: string
          rastreio?: string | null
          status?: string
        }
        Update: {
          atualizado_em?: string
          envio_correto?: boolean
          linha_item_id?: string
          rastreio?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "entregas_linha_item_id_fkey"
            columns: ["linha_item_id"]
            isOneToOne: true
            referencedRelation: "afiliado_ganhos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entregas_linha_item_id_fkey"
            columns: ["linha_item_id"]
            isOneToOne: true
            referencedRelation: "linha_itens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entregas_linha_item_id_fkey"
            columns: ["linha_item_id"]
            isOneToOne: true
            referencedRelation: "linha_itens_cliente"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entregas_linha_item_id_fkey"
            columns: ["linha_item_id"]
            isOneToOne: true
            referencedRelation: "logistica_itens"
            referencedColumns: ["id"]
          },
        ]
      }
      faixas_cep: {
        Row: {
          ativo: boolean
          cep_final: number
          cep_inicial: number
          id: string
          kg_adicional: number
          loja_id: string | null
          percentual: number
        }
        Insert: {
          ativo?: boolean
          cep_final: number
          cep_inicial: number
          id?: string
          kg_adicional?: number
          loja_id?: string | null
          percentual?: number
        }
        Update: {
          ativo?: boolean
          cep_final?: number
          cep_inicial?: number
          id?: string
          kg_adicional?: number
          loja_id?: string | null
          percentual?: number
        }
        Relationships: [
          {
            foreignKeyName: "faixas_cep_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "lojas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "faixas_cep_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "lojas_vitrine"
            referencedColumns: ["id"]
          },
        ]
      }
      frete_tabela: {
        Row: {
          ativo: boolean
          criado_em: string
          destino_cep_final: number
          destino_cep_inicial: number
          id: string
          multiplicador_urgente: number
          origem_cep_final: number
          origem_cep_inicial: number
          preco_base: number
          preco_por_kg: number
        }
        Insert: {
          ativo?: boolean
          criado_em?: string
          destino_cep_final: number
          destino_cep_inicial: number
          id?: string
          multiplicador_urgente?: number
          origem_cep_final: number
          origem_cep_inicial: number
          preco_base: number
          preco_por_kg?: number
        }
        Update: {
          ativo?: boolean
          criado_em?: string
          destino_cep_final?: number
          destino_cep_inicial?: number
          id?: string
          multiplicador_urgente?: number
          origem_cep_final?: number
          origem_cep_inicial?: number
          preco_base?: number
          preco_por_kg?: number
        }
        Relationships: []
      }
      lead_interacoes: {
        Row: {
          autor_id: string
          conteudo: string
          created_at: string
          id: string
          lead_id: string
        }
        Insert: {
          autor_id: string
          conteudo: string
          created_at?: string
          id?: string
          lead_id: string
        }
        Update: {
          autor_id?: string
          conteudo?: string
          created_at?: string
          id?: string
          lead_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_interacoes_autor_id_fkey"
            columns: ["autor_id"]
            isOneToOne: false
            referencedRelation: "admins"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "lead_interacoes_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          contato: string
          conversa_id: string | null
          created_at: string
          id: string
          interesse: string | null
          nome: string | null
          responsavel_id: string | null
          status: string
        }
        Insert: {
          contato: string
          conversa_id?: string | null
          created_at?: string
          id?: string
          interesse?: string | null
          nome?: string | null
          responsavel_id?: string | null
          status?: string
        }
        Update: {
          contato?: string
          conversa_id?: string | null
          created_at?: string
          id?: string
          interesse?: string | null
          nome?: string | null
          responsavel_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_conversa_id_fkey"
            columns: ["conversa_id"]
            isOneToOne: false
            referencedRelation: "bot_conversas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "admins"
            referencedColumns: ["user_id"]
          },
        ]
      }
      leilao_lances: {
        Row: {
          condicoes: string | null
          criado_em: string
          id: string
          leilao_id: string
          loja_id: string
          prazo: string
          preco: number
        }
        Insert: {
          condicoes?: string | null
          criado_em?: string
          id?: string
          leilao_id: string
          loja_id: string
          prazo: string
          preco: number
        }
        Update: {
          condicoes?: string | null
          criado_em?: string
          id?: string
          leilao_id?: string
          loja_id?: string
          prazo?: string
          preco?: number
        }
        Relationships: [
          {
            foreignKeyName: "leilao_lances_leilao_id_fkey"
            columns: ["leilao_id"]
            isOneToOne: false
            referencedRelation: "leiloes_fabricantes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leilao_lances_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "lojas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leilao_lances_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "lojas_vitrine"
            referencedColumns: ["id"]
          },
        ]
      }
      leiloes_fabricantes: {
        Row: {
          categoria_id: string | null
          comprador_id: string
          criado_em: string
          descricao: string
          id: string
          janela_fim: string
          lance_vencedor: string | null
          prazo_desejado: string | null
          status: string
          titulo: string
          volume: string
        }
        Insert: {
          categoria_id?: string | null
          comprador_id: string
          criado_em?: string
          descricao: string
          id?: string
          janela_fim: string
          lance_vencedor?: string | null
          prazo_desejado?: string | null
          status?: string
          titulo: string
          volume: string
        }
        Update: {
          categoria_id?: string | null
          comprador_id?: string
          criado_em?: string
          descricao?: string
          id?: string
          janela_fim?: string
          lance_vencedor?: string | null
          prazo_desejado?: string | null
          status?: string
          titulo?: string
          volume?: string
        }
        Relationships: [
          {
            foreignKeyName: "leiloes_fabricantes_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leiloes_lance_vencedor_fkey"
            columns: ["lance_vencedor"]
            isOneToOne: false
            referencedRelation: "leilao_lances"
            referencedColumns: ["id"]
          },
        ]
      }
      linha_itens: {
        Row: {
          afiliado_id: string | null
          bubble_id: string | null
          centro_id: string | null
          cod_entrega: string | null
          data_entrega: string | null
          dt_pagamento_cliente: string | null
          entrega_bairro: string | null
          entrega_cep: string | null
          entrega_cidade: string | null
          entrega_complemento: string | null
          entrega_numero: string | null
          entrega_rua: string | null
          entregue: boolean
          id: string
          pago: boolean
          pedido_id: string
          produto_id: string | null
          produto_nome: string | null
          quantidade: number
          repasse_afiliado: number
          repasse_ind: number
          repasse_vendedor: number | null
          retirar_na_loja: boolean
          transferido: boolean
          valor: number
          valor_frete: number | null
          venda_futura_id: string | null
        }
        Insert: {
          afiliado_id?: string | null
          bubble_id?: string | null
          centro_id?: string | null
          cod_entrega?: string | null
          data_entrega?: string | null
          dt_pagamento_cliente?: string | null
          entrega_bairro?: string | null
          entrega_cep?: string | null
          entrega_cidade?: string | null
          entrega_complemento?: string | null
          entrega_numero?: string | null
          entrega_rua?: string | null
          entregue?: boolean
          id?: string
          pago?: boolean
          pedido_id: string
          produto_id?: string | null
          produto_nome?: string | null
          quantidade: number
          repasse_afiliado?: number
          repasse_ind?: number
          repasse_vendedor?: number | null
          retirar_na_loja?: boolean
          transferido?: boolean
          valor: number
          valor_frete?: number | null
          venda_futura_id?: string | null
        }
        Update: {
          afiliado_id?: string | null
          bubble_id?: string | null
          centro_id?: string | null
          cod_entrega?: string | null
          data_entrega?: string | null
          dt_pagamento_cliente?: string | null
          entrega_bairro?: string | null
          entrega_cep?: string | null
          entrega_cidade?: string | null
          entrega_complemento?: string | null
          entrega_numero?: string | null
          entrega_rua?: string | null
          entregue?: boolean
          id?: string
          pago?: boolean
          pedido_id?: string
          produto_id?: string | null
          produto_nome?: string | null
          quantidade?: number
          repasse_afiliado?: number
          repasse_ind?: number
          repasse_vendedor?: number | null
          retirar_na_loja?: boolean
          transferido?: boolean
          valor?: number
          valor_frete?: number | null
          venda_futura_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "linha_itens_centro_id_fkey"
            columns: ["centro_id"]
            isOneToOne: false
            referencedRelation: "centros_distribuicao"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "linha_itens_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "logistica_pedidos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "linha_itens_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "linha_itens_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos_cliente"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "linha_itens_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "linha_itens_venda_futura_id_fkey"
            columns: ["venda_futura_id"]
            isOneToOne: false
            referencedRelation: "vendas_futuras"
            referencedColumns: ["id"]
          },
        ]
      }
      lojas: {
        Row: {
          bairro: string | null
          banner_url: string | null
          bubble_id: string | null
          cep: string | null
          chave_pix: string | null
          chave_pix_confirmada_em: string | null
          cidade: string | null
          cnpj: string | null
          complemento: string | null
          created_at: string
          descricao: string | null
          email: string | null
          estado: string | null
          id: string
          logotipo_url: string | null
          nome: string
          numero: string | null
          owner_id: string
          permite_retirada_na_loja: boolean
          razao_social: string | null
          rua: string | null
          situacao: string
          tipo_chave_pix: string | null
          valor_pedido_minimo: number | null
          whatsapp: string | null
        }
        Insert: {
          bairro?: string | null
          banner_url?: string | null
          bubble_id?: string | null
          cep?: string | null
          chave_pix?: string | null
          chave_pix_confirmada_em?: string | null
          cidade?: string | null
          cnpj?: string | null
          complemento?: string | null
          created_at?: string
          descricao?: string | null
          email?: string | null
          estado?: string | null
          id?: string
          logotipo_url?: string | null
          nome: string
          numero?: string | null
          owner_id: string
          permite_retirada_na_loja?: boolean
          razao_social?: string | null
          rua?: string | null
          situacao?: string
          tipo_chave_pix?: string | null
          valor_pedido_minimo?: number | null
          whatsapp?: string | null
        }
        Update: {
          bairro?: string | null
          banner_url?: string | null
          bubble_id?: string | null
          cep?: string | null
          chave_pix?: string | null
          chave_pix_confirmada_em?: string | null
          cidade?: string | null
          cnpj?: string | null
          complemento?: string | null
          created_at?: string
          descricao?: string | null
          email?: string | null
          estado?: string | null
          id?: string
          logotipo_url?: string | null
          nome?: string
          numero?: string | null
          owner_id?: string
          permite_retirada_na_loja?: boolean
          razao_social?: string | null
          rua?: string | null
          situacao?: string
          tipo_chave_pix?: string | null
          valor_pedido_minimo?: number | null
          whatsapp?: string | null
        }
        Relationships: []
      }
      lote_pedidos: {
        Row: {
          frete_rateado: number
          lote_id: string
          pedido_id: string
        }
        Insert: {
          frete_rateado?: number
          lote_id: string
          pedido_id: string
        }
        Update: {
          frete_rateado?: number
          lote_id?: string
          pedido_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lote_pedidos_lote_id_fkey"
            columns: ["lote_id"]
            isOneToOne: false
            referencedRelation: "lotes_consolidacao"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lote_pedidos_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: true
            referencedRelation: "logistica_pedidos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lote_pedidos_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: true
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lote_pedidos_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: true
            referencedRelation: "pedidos_cliente"
            referencedColumns: ["id"]
          },
        ]
      }
      lotes_consolidacao: {
        Row: {
          corredor_cep: string
          corrida_id: string | null
          criado_em: string
          criado_por: string | null
          id: string
          loja_id: string
          status: string
        }
        Insert: {
          corredor_cep: string
          corrida_id?: string | null
          criado_em?: string
          criado_por?: string | null
          id?: string
          loja_id: string
          status?: string
        }
        Update: {
          corredor_cep?: string
          corrida_id?: string | null
          criado_em?: string
          criado_por?: string | null
          id?: string
          loja_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "lotes_consolidacao_corrida_id_fkey"
            columns: ["corrida_id"]
            isOneToOne: false
            referencedRelation: "corridas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lotes_consolidacao_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "lojas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lotes_consolidacao_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "lojas_vitrine"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_config: {
        Row: {
          atualizado_em: string
          banner_desktop_url: string | null
          banner_mobile_url: string | null
          id: number
        }
        Insert: {
          atualizado_em?: string
          banner_desktop_url?: string | null
          banner_mobile_url?: string | null
          id?: number
        }
        Update: {
          atualizado_em?: string
          banner_desktop_url?: string | null
          banner_mobile_url?: string | null
          id?: number
        }
        Relationships: []
      }
      mensagens: {
        Row: {
          autor_id: string
          conversa_id: string
          corpo: string
          created_at: string
          id: string
          lida_em: string | null
        }
        Insert: {
          autor_id: string
          conversa_id: string
          corpo: string
          created_at?: string
          id?: string
          lida_em?: string | null
        }
        Update: {
          autor_id?: string
          conversa_id?: string
          corpo?: string
          created_at?: string
          id?: string
          lida_em?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mensagens_conversa_id_fkey"
            columns: ["conversa_id"]
            isOneToOne: false
            referencedRelation: "conversas"
            referencedColumns: ["id"]
          },
        ]
      }
      paginas_cms: {
        Row: {
          atualizado_em: string
          conteudo_rich: string
          slug: string
          titulo: string
        }
        Insert: {
          atualizado_em?: string
          conteudo_rich?: string
          slug: string
          titulo: string
        }
        Update: {
          atualizado_em?: string
          conteudo_rich?: string
          slug?: string
          titulo?: string
        }
        Relationships: []
      }
      parceiros_logisticos: {
        Row: {
          area_atuacao: string | null
          capacidade_kg: number | null
          capacidade_m3: number | null
          cep_base: string | null
          chave_pix: string | null
          chave_pix_confirmada_em: string | null
          cnh: string | null
          criado_em: string
          doc_veiculo: string | null
          id: string
          nome: string
          nota_media: number | null
          placa: string | null
          status: string
          telefone: string | null
          termos_aceitos_em: string | null
          termos_versao: string | null
          tipo: string
          tipo_chave_pix: string | null
          user_id: string
          valor_minimo_entrega: number | null
        }
        Insert: {
          area_atuacao?: string | null
          capacidade_kg?: number | null
          capacidade_m3?: number | null
          cep_base?: string | null
          chave_pix?: string | null
          chave_pix_confirmada_em?: string | null
          cnh?: string | null
          criado_em?: string
          doc_veiculo?: string | null
          id?: string
          nome: string
          nota_media?: number | null
          placa?: string | null
          status?: string
          telefone?: string | null
          termos_aceitos_em?: string | null
          termos_versao?: string | null
          tipo: string
          tipo_chave_pix?: string | null
          user_id: string
          valor_minimo_entrega?: number | null
        }
        Update: {
          area_atuacao?: string | null
          capacidade_kg?: number | null
          capacidade_m3?: number | null
          cep_base?: string | null
          chave_pix?: string | null
          chave_pix_confirmada_em?: string | null
          cnh?: string | null
          criado_em?: string
          doc_veiculo?: string | null
          id?: string
          nome?: string
          nota_media?: number | null
          placa?: string | null
          status?: string
          telefone?: string | null
          termos_aceitos_em?: string | null
          termos_versao?: string | null
          tipo?: string
          tipo_chave_pix?: string | null
          user_id?: string
          valor_minimo_entrega?: number | null
        }
        Relationships: []
      }
      parcerias_representante: {
        Row: {
          criado_em: string
          id: string
          loja_id: string
          porcentagem: number
          produto_id: string | null
          representante_id: string
          status: string
        }
        Insert: {
          criado_em?: string
          id?: string
          loja_id: string
          porcentagem: number
          produto_id?: string | null
          representante_id: string
          status?: string
        }
        Update: {
          criado_em?: string
          id?: string
          loja_id?: string
          porcentagem?: number
          produto_id?: string | null
          representante_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "parcerias_representante_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "lojas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parcerias_representante_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "lojas_vitrine"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parcerias_representante_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
        ]
      }
      pedidos: {
        Row: {
          asaas_cobranca_id: string | null
          bubble_id: string | null
          cliente_id: string | null
          cliente_nome: string | null
          codigo_retirada: string | null
          codigo_tentativas: number
          created_at: string
          data: string
          disputa_aberta_em: string | null
          dt_pagamento: string | null
          forma_pagamento: string | null
          frete_consolidado: boolean
          id: string
          id_venda: string
          link_cobranca: string | null
          loja_id: string
          repasse_ind24: number | null
          status_pedido: string
          telefone_contato: string | null
          termos_aceitos_em: string | null
          termos_versao: string | null
          valor_pedido: number
          valor_recebido_industria: string | null
        }
        Insert: {
          asaas_cobranca_id?: string | null
          bubble_id?: string | null
          cliente_id?: string | null
          cliente_nome?: string | null
          codigo_retirada?: string | null
          codigo_tentativas?: number
          created_at?: string
          data?: string
          disputa_aberta_em?: string | null
          dt_pagamento?: string | null
          forma_pagamento?: string | null
          frete_consolidado?: boolean
          id?: string
          id_venda: string
          link_cobranca?: string | null
          loja_id: string
          repasse_ind24?: number | null
          status_pedido?: string
          telefone_contato?: string | null
          termos_aceitos_em?: string | null
          termos_versao?: string | null
          valor_pedido?: number
          valor_recebido_industria?: string | null
        }
        Update: {
          asaas_cobranca_id?: string | null
          bubble_id?: string | null
          cliente_id?: string | null
          cliente_nome?: string | null
          codigo_retirada?: string | null
          codigo_tentativas?: number
          created_at?: string
          data?: string
          disputa_aberta_em?: string | null
          dt_pagamento?: string | null
          forma_pagamento?: string | null
          frete_consolidado?: boolean
          id?: string
          id_venda?: string
          link_cobranca?: string | null
          loja_id?: string
          repasse_ind24?: number | null
          status_pedido?: string
          telefone_contato?: string | null
          termos_aceitos_em?: string | null
          termos_versao?: string | null
          valor_pedido?: number
          valor_recebido_industria?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pedidos_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "lojas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedidos_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "lojas_vitrine"
            referencedColumns: ["id"]
          },
        ]
      }
      perfis_compradores: {
        Row: {
          atualizado_em: string
          criado_em: string
          documento: string | null
          produtor_rural: boolean
          razao_social: string | null
          tipo_documento: string | null
          user_id: string
        }
        Insert: {
          atualizado_em?: string
          criado_em?: string
          documento?: string | null
          produtor_rural?: boolean
          razao_social?: string | null
          tipo_documento?: string | null
          user_id: string
        }
        Update: {
          atualizado_em?: string
          criado_em?: string
          documento?: string | null
          produtor_rural?: boolean
          razao_social?: string | null
          tipo_documento?: string | null
          user_id?: string
        }
        Relationships: []
      }
      produto_centros: {
        Row: {
          centro_id: string
          produto_id: string
        }
        Insert: {
          centro_id: string
          produto_id: string
        }
        Update: {
          centro_id?: string
          produto_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "produto_centros_centro_id_fkey"
            columns: ["centro_id"]
            isOneToOne: false
            referencedRelation: "centros_distribuicao"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "produto_centros_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
        ]
      }
      produto_curadoria: {
        Row: {
          admin_id: string
          created_at: string
          decisao: string
          id: string
          observacao: string | null
          produto_id: string
        }
        Insert: {
          admin_id?: string
          created_at?: string
          decisao: string
          id?: string
          observacao?: string | null
          produto_id: string
        }
        Update: {
          admin_id?: string
          created_at?: string
          decisao?: string
          id?: string
          observacao?: string | null
          produto_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "produto_curadoria_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
        ]
      }
      produto_imagens: {
        Row: {
          id: string
          ordem: number
          produto_id: string
          url: string
        }
        Insert: {
          id?: string
          ordem?: number
          produto_id: string
          url: string
        }
        Update: {
          id?: string
          ordem?: number
          produto_id?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "produto_imagens_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
        ]
      }
      produto_sugestoes_ia: {
        Row: {
          conteudo: string
          created_at: string
          criado_por: string
          id: string
          motivo: string | null
          produto_id: string
          resolved_at: string | null
          resolved_by: string | null
          status: string
          tipo: string
        }
        Insert: {
          conteudo: string
          created_at?: string
          criado_por?: string
          id?: string
          motivo?: string | null
          produto_id: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          tipo: string
        }
        Update: {
          conteudo?: string
          created_at?: string
          criado_por?: string
          id?: string
          motivo?: string | null
          produto_id?: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "produto_sugestoes_ia_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
        ]
      }
      produtos: {
        Row: {
          altura: number | null
          bubble_id: string | null
          categoria_id: string | null
          cep_produto: string | null
          comprimento: number | null
          created_at: string
          descricao: string | null
          estoque_atual: number
          frete_gratis: boolean
          id: string
          largura: number | null
          loja_id: string
          nome: string
          permite_afiliacao: boolean
          permite_logistica_afiliado: boolean
          peso: number | null
          porcentagem_afiliado: number | null
          quantidade_minima: number | null
          sku: string | null
          status_produto: string
          subcategoria_id: string | null
          valor: number
        }
        Insert: {
          altura?: number | null
          bubble_id?: string | null
          categoria_id?: string | null
          cep_produto?: string | null
          comprimento?: number | null
          created_at?: string
          descricao?: string | null
          estoque_atual?: number
          frete_gratis?: boolean
          id?: string
          largura?: number | null
          loja_id: string
          nome: string
          permite_afiliacao?: boolean
          permite_logistica_afiliado?: boolean
          peso?: number | null
          porcentagem_afiliado?: number | null
          quantidade_minima?: number | null
          sku?: string | null
          status_produto?: string
          subcategoria_id?: string | null
          valor: number
        }
        Update: {
          altura?: number | null
          bubble_id?: string | null
          categoria_id?: string | null
          cep_produto?: string | null
          comprimento?: number | null
          created_at?: string
          descricao?: string | null
          estoque_atual?: number
          frete_gratis?: boolean
          id?: string
          largura?: number | null
          loja_id?: string
          nome?: string
          permite_afiliacao?: boolean
          permite_logistica_afiliado?: boolean
          peso?: number | null
          porcentagem_afiliado?: number | null
          quantidade_minima?: number | null
          sku?: string | null
          status_produto?: string
          subcategoria_id?: string | null
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "produtos_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "produtos_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "lojas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "produtos_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "lojas_vitrine"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "produtos_subcategoria_id_fkey"
            columns: ["subcategoria_id"]
            isOneToOne: false
            referencedRelation: "subcategorias"
            referencedColumns: ["id"]
          },
        ]
      }
      produtos_patrocinados: {
        Row: {
          criado_em: string
          data_fim: string | null
          data_inicio: string
          id: string
          loja_id: string
          meta_campaign_id: string | null
          orcamento_diario: number
          produto_id: string
          status: string
        }
        Insert: {
          criado_em?: string
          data_fim?: string | null
          data_inicio: string
          id?: string
          loja_id: string
          meta_campaign_id?: string | null
          orcamento_diario: number
          produto_id: string
          status?: string
        }
        Update: {
          criado_em?: string
          data_fim?: string | null
          data_inicio?: string
          id?: string
          loja_id?: string
          meta_campaign_id?: string | null
          orcamento_diario?: number
          produto_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "produtos_patrocinados_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "lojas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "produtos_patrocinados_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "lojas_vitrine"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "produtos_patrocinados_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
        ]
      }
      promocoes_progressivas: {
        Row: {
          ativo: boolean
          bubble_id: string | null
          created_at: string
          faixas: Json
          id: string
          produto_id: string
        }
        Insert: {
          ativo?: boolean
          bubble_id?: string | null
          created_at?: string
          faixas?: Json
          id?: string
          produto_id: string
        }
        Update: {
          ativo?: boolean
          bubble_id?: string | null
          created_at?: string
          faixas?: Json
          id?: string
          produto_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "promocoes_progressivas_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: true
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
        ]
      }
      reclamacoes: {
        Row: {
          created_at: string
          id: string
          loja_id: string
          motivo: string
          pedido_id: string
          resolved_at: string | null
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          loja_id: string
          motivo: string
          pedido_id: string
          resolved_at?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          loja_id?: string
          motivo?: string
          pedido_id?: string
          resolved_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "reclamacoes_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "lojas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reclamacoes_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "lojas_vitrine"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reclamacoes_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "logistica_pedidos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reclamacoes_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reclamacoes_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos_cliente"
            referencedColumns: ["id"]
          },
        ]
      }
      repasses: {
        Row: {
          afiliado_id: string | null
          criado_em: string
          destino: string
          id: string
          loja_id: string | null
          pedido_id: string
          status: string
          transferido_em: string | null
          valor: number
        }
        Insert: {
          afiliado_id?: string | null
          criado_em?: string
          destino: string
          id?: string
          loja_id?: string | null
          pedido_id: string
          status?: string
          transferido_em?: string | null
          valor: number
        }
        Update: {
          afiliado_id?: string | null
          criado_em?: string
          destino?: string
          id?: string
          loja_id?: string | null
          pedido_id?: string
          status?: string
          transferido_em?: string | null
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "repasses_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "lojas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "repasses_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "lojas_vitrine"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "repasses_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "logistica_pedidos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "repasses_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "repasses_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos_cliente"
            referencedColumns: ["id"]
          },
        ]
      }
      rotas: {
        Row: {
          afiliado_id: string | null
          criado_em: string
          destino_cep: string | null
          distancia_m: number | null
          duracao_s: number | null
          frete_calculado: number | null
          id: string
          link_mapa: string | null
          origem_cep: string | null
          parceiro_id: string | null
          pedido_id: string
          status: string
          whatsapp_enviado_em: string | null
        }
        Insert: {
          afiliado_id?: string | null
          criado_em?: string
          destino_cep?: string | null
          distancia_m?: number | null
          duracao_s?: number | null
          frete_calculado?: number | null
          id?: string
          link_mapa?: string | null
          origem_cep?: string | null
          parceiro_id?: string | null
          pedido_id: string
          status?: string
          whatsapp_enviado_em?: string | null
        }
        Update: {
          afiliado_id?: string | null
          criado_em?: string
          destino_cep?: string | null
          distancia_m?: number | null
          duracao_s?: number | null
          frete_calculado?: number | null
          id?: string
          link_mapa?: string | null
          origem_cep?: string | null
          parceiro_id?: string | null
          pedido_id?: string
          status?: string
          whatsapp_enviado_em?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rotas_parceiro_id_fkey"
            columns: ["parceiro_id"]
            isOneToOne: false
            referencedRelation: "parceiros_logisticos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rotas_parceiro_id_fkey"
            columns: ["parceiro_id"]
            isOneToOne: false
            referencedRelation: "parceiros_publicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rotas_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: true
            referencedRelation: "logistica_pedidos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rotas_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: true
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rotas_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: true
            referencedRelation: "pedidos_cliente"
            referencedColumns: ["id"]
          },
        ]
      }
      socios_solicitacao_credito: {
        Row: {
          cpf: string | null
          id: string
          nome: string
          percentual_participacao: number | null
          solicitacao_id: string
        }
        Insert: {
          cpf?: string | null
          id?: string
          nome: string
          percentual_participacao?: number | null
          solicitacao_id: string
        }
        Update: {
          cpf?: string | null
          id?: string
          nome?: string
          percentual_participacao?: number | null
          solicitacao_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "socios_solicitacao_credito_solicitacao_id_fkey"
            columns: ["solicitacao_id"]
            isOneToOne: false
            referencedRelation: "solicitacoes_credito"
            referencedColumns: ["id"]
          },
        ]
      }
      solicitacoes_credito: {
        Row: {
          criado_em: string
          finalidade: string | null
          id: string
          loja_id: string
          observacoes: string | null
          prazo_meses: number | null
          respondido_em: string | null
          status: string
          valor_solicitado: number
        }
        Insert: {
          criado_em?: string
          finalidade?: string | null
          id?: string
          loja_id: string
          observacoes?: string | null
          prazo_meses?: number | null
          respondido_em?: string | null
          status?: string
          valor_solicitado: number
        }
        Update: {
          criado_em?: string
          finalidade?: string | null
          id?: string
          loja_id?: string
          observacoes?: string | null
          prazo_meses?: number | null
          respondido_em?: string | null
          status?: string
          valor_solicitado?: number
        }
        Relationships: [
          {
            foreignKeyName: "solicitacoes_credito_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "lojas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solicitacoes_credito_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "lojas_vitrine"
            referencedColumns: ["id"]
          },
        ]
      }
      subcategorias: {
        Row: {
          bubble_id: string | null
          categoria_id: string | null
          id: string
          nome: string
        }
        Insert: {
          bubble_id?: string | null
          categoria_id?: string | null
          id?: string
          nome: string
        }
        Update: {
          bubble_id?: string | null
          categoria_id?: string | null
          id?: string
          nome?: string
        }
        Relationships: [
          {
            foreignKeyName: "subcategorias_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias"
            referencedColumns: ["id"]
          },
        ]
      }
      vendas_futuras: {
        Row: {
          bubble_id: string | null
          created_at: string
          estoque: number | null
          id: string
          previsao: string | null
          produto_id: string
          valor: number | null
        }
        Insert: {
          bubble_id?: string | null
          created_at?: string
          estoque?: number | null
          id?: string
          previsao?: string | null
          produto_id: string
          valor?: number | null
        }
        Update: {
          bubble_id?: string | null
          created_at?: string
          estoque?: number | null
          id?: string
          previsao?: string | null
          produto_id?: string
          valor?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "vendas_futuras_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      afiliado_ganhos: {
        Row: {
          afiliado_id: string | null
          id: string | null
          id_venda: string | null
          pago: boolean | null
          pedido_data: string | null
          pedido_id: string | null
          produto_id: string | null
          produto_nome: string | null
          quantidade: number | null
          repasse_afiliado: number | null
          valor: number | null
        }
        Relationships: [
          {
            foreignKeyName: "linha_itens_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "logistica_pedidos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "linha_itens_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "linha_itens_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos_cliente"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "linha_itens_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
        ]
      }
      coletiva_pagamentos: {
        Row: {
          coletiva_id: string | null
          pedidos_gerados: number | null
          pedidos_pagos: number | null
        }
        Relationships: [
          {
            foreignKeyName: "coletiva_participacoes_coletiva_id_fkey"
            columns: ["coletiva_id"]
            isOneToOne: false
            referencedRelation: "compras_coletivas"
            referencedColumns: ["id"]
          },
        ]
      }
      linha_itens_cliente: {
        Row: {
          entrega_bairro: string | null
          entrega_cep: string | null
          entrega_cidade: string | null
          entrega_numero: string | null
          entrega_rua: string | null
          id: string | null
          pedido_id: string | null
          produto_nome: string | null
          quantidade: number | null
          retirar_na_loja: boolean | null
          valor: number | null
          valor_frete: number | null
        }
        Relationships: [
          {
            foreignKeyName: "linha_itens_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "logistica_pedidos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "linha_itens_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "linha_itens_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos_cliente"
            referencedColumns: ["id"]
          },
        ]
      }
      logistica_itens: {
        Row: {
          entrega_bairro: string | null
          entrega_cep: string | null
          entrega_cidade: string | null
          entrega_complemento: string | null
          entrega_numero: string | null
          entrega_rua: string | null
          id: string | null
          pedido_id: string | null
          produto_nome: string | null
          quantidade: number | null
          retirar_na_loja: boolean | null
          valor: number | null
        }
        Relationships: [
          {
            foreignKeyName: "linha_itens_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "logistica_pedidos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "linha_itens_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "linha_itens_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos_cliente"
            referencedColumns: ["id"]
          },
        ]
      }
      logistica_pedidos: {
        Row: {
          data: string | null
          id: string | null
          id_venda: string | null
          loja_id: string | null
          status_pedido: string | null
        }
        Insert: {
          data?: string | null
          id?: string | null
          id_venda?: string | null
          loja_id?: string | null
          status_pedido?: string | null
        }
        Update: {
          data?: string | null
          id?: string | null
          id_venda?: string | null
          loja_id?: string | null
          status_pedido?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pedidos_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "lojas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedidos_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "lojas_vitrine"
            referencedColumns: ["id"]
          },
        ]
      }
      lojas_vitrine: {
        Row: {
          banner_url: string | null
          cidade: string | null
          descricao: string | null
          estado: string | null
          id: string | null
          logotipo_url: string | null
          nome: string | null
          permite_retirada_na_loja: boolean | null
          situacao: string | null
          valor_pedido_minimo: number | null
          whatsapp: string | null
        }
        Insert: {
          banner_url?: string | null
          cidade?: string | null
          descricao?: string | null
          estado?: string | null
          id?: string | null
          logotipo_url?: string | null
          nome?: string | null
          permite_retirada_na_loja?: boolean | null
          situacao?: string | null
          valor_pedido_minimo?: number | null
          whatsapp?: string | null
        }
        Update: {
          banner_url?: string | null
          cidade?: string | null
          descricao?: string | null
          estado?: string | null
          id?: string | null
          logotipo_url?: string | null
          nome?: string | null
          permite_retirada_na_loja?: boolean | null
          situacao?: string | null
          valor_pedido_minimo?: number | null
          whatsapp?: string | null
        }
        Relationships: []
      }
      parceiros_publicos: {
        Row: {
          capacidade_kg: number | null
          capacidade_m3: number | null
          id: string | null
          nome: string | null
          nota_media: number | null
          tipo: string | null
        }
        Insert: {
          capacidade_kg?: number | null
          capacidade_m3?: number | null
          id?: string | null
          nome?: string | null
          nota_media?: number | null
          tipo?: string | null
        }
        Update: {
          capacidade_kg?: number | null
          capacidade_m3?: number | null
          id?: string | null
          nome?: string | null
          nota_media?: number | null
          tipo?: string | null
        }
        Relationships: []
      }
      pedidos_cliente: {
        Row: {
          asaas_cobranca_id: string | null
          codigo_retirada: string | null
          data: string | null
          forma_pagamento: string | null
          id: string | null
          id_venda: string | null
          link_cobranca: string | null
          status_pedido: string | null
          valor_pedido: number | null
        }
        Insert: {
          asaas_cobranca_id?: string | null
          codigo_retirada?: string | null
          data?: string | null
          forma_pagamento?: string | null
          id?: string | null
          id_venda?: string | null
          link_cobranca?: string | null
          status_pedido?: string | null
          valor_pedido?: number | null
        }
        Update: {
          asaas_cobranca_id?: string | null
          codigo_retirada?: string | null
          data?: string | null
          forma_pagamento?: string | null
          id?: string | null
          id_venda?: string | null
          link_cobranca?: string | null
          status_pedido?: string | null
          valor_pedido?: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      aceitar_corrida: { Args: { p_corrida_id: string }; Returns: undefined }
      adjudicar_leilao: {
        Args: { p_lance_id: string; p_leilao_id: string }
        Returns: undefined
      }
      admin_abrir_disputa: {
        Args: { p_motivo: string; p_pedido_id: string }
        Returns: undefined
      }
      admin_definir_role: {
        Args: { p_role: string; p_user_id: string }
        Returns: undefined
      }
      admin_estornar_pedido: {
        Args: { p_motivo: string; p_pedido_id: string }
        Returns: undefined
      }
      admin_list_users: {
        Args: never
        Returns: {
          banned_until: string
          criado_em: string
          eh_admin: boolean
          email: string
          id: string
          loja_nome: string
          role: string
          ultimo_login: string
        }[]
      }
      alterar_chave_pix_loja: {
        Args: {
          p_chave_pix: string
          p_loja_id: string
          p_tipo_chave_pix: string
        }
        Returns: undefined
      }
      alterar_chave_pix_parceiro: {
        Args: { p_chave_pix: string; p_tipo_chave_pix: string }
        Returns: undefined
      }
      api_registrar_uso: {
        Args: {
          p_erro: string
          p_ip: string
          p_key_id: string
          p_loja_id: string
          p_ok: boolean
          p_params: Json
          p_tool: string
        }
        Returns: undefined
      }
      api_validar_token: {
        Args: { p_escopo: string; p_token_hash: string }
        Returns: {
          escopo: string
          key_id: string
          loja_id: string
        }[]
      }
      atribuir_rota: {
        Args: {
          p_afiliado_id?: string
          p_parceiro_id?: string
          p_rota_id: string
        }
        Returns: undefined
      }
      atualizar_status_corrida: {
        Args: {
          p_assinatura_url?: string
          p_corrida_id: string
          p_foto_url?: string
          p_status: string
        }
        Returns: undefined
      }
      atualizar_status_rota: {
        Args: { p_rota_id: string; p_status: string }
        Returns: undefined
      }
      calcular_frete: {
        Args: {
          p_destino_cep: string
          p_origem_cep: string
          p_peso_kg: number
          p_urgencia?: string
        }
        Returns: number
      }
      calcular_repasses_pedido: {
        Args: { p_pedido_id: string }
        Returns: undefined
      }
      cancelar_corrida: { Args: { p_corrida_id: string }; Returns: undefined }
      cancelar_lote_consolidacao: {
        Args: { p_lote_id: string }
        Returns: undefined
      }
      carimbar_aceite_mf: { Args: { p_pedido_id: string }; Returns: undefined }
      chave_pix_elegivel_repasse: {
        Args: { p_loja_id: string }
        Returns: boolean
      }
      checar_rate_limit: {
        Args: { p_acao: string; p_janela_min: number; p_limite: number }
        Returns: boolean
      }
      checkout_criar_pedido:
        | {
            Args: { entrega: Json; forma_pagamento: string; itens: Json }
            Returns: string
          }
        | {
            Args: {
              entrega: Json
              forma_pagamento: string
              itens: Json
              ref: string
            }
            Returns: string
          }
        | {
            Args: {
              entrega: Json
              forma_pagamento: string
              frete_consolidado: boolean
              itens: Json
              ref: string
            }
            Returns: string
          }
      coletiva_cancelar: { Args: { p_coletiva_id: string }; Returns: undefined }
      coletiva_criar: {
        Args: {
          p_entrega?: Json
          p_prazo_dias?: number
          p_produto_id: string
          p_quantidade: number
        }
        Returns: string
      }
      coletiva_evento: {
        Args: { p_coletiva_id: string; p_payload?: Json; p_tipo: string }
        Returns: undefined
      }
      coletiva_expirar_pagamentos: {
        Args: { p_coletiva_id: string }
        Returns: Json
      }
      coletiva_fechar: {
        Args: { p_coletiva_id: string; p_forcar?: boolean }
        Returns: Json
      }
      coletiva_mural: { Args: { p_coletiva_id: string }; Returns: string }
      coletiva_participar: {
        Args: { p_coletiva_id: string; p_quantidade: number }
        Returns: Json
      }
      coletiva_preco_lote: {
        Args: { p_base: number; p_lotes: Json; p_qtd: number }
        Returns: number
      }
      confirmar_chave_pix: { Args: { p_loja_id: string }; Returns: undefined }
      criar_lote_consolidacao: {
        Args: { p_pedido_ids: string[] }
        Returns: string
      }
      dar_lance_corrida: {
        Args: { p_corrida_id: string; p_prazo: string; p_valor: number }
        Returns: undefined
      }
      dar_lance_leilao: {
        Args: {
          p_condicoes?: string
          p_leilao_id: string
          p_prazo: string
          p_preco: number
        }
        Returns: undefined
      }
      despachar_corrida_automatica: {
        Args: { p_pedido_id: string }
        Returns: string
      }
      eh_afiliado_logistica: { Args: { p_loja: string }; Returns: boolean }
      eh_participante_conversa: {
        Args: { p_conversa_id: string }
        Returns: boolean
      }
      escolher_lance_corrida: {
        Args: { p_lance_id: string }
        Returns: undefined
      }
      has_role: { Args: { p_roles: string[] }; Returns: boolean }
      is_admin: { Args: never; Returns: boolean }
      is_super_admin: { Args: never; Returns: boolean }
      listar_admins: {
        Args: never
        Returns: {
          email: string
          user_id: string
        }[]
      }
      parceiros_disponiveis_loja: {
        Args: { p_loja_id: string }
        Returns: {
          id: string
          nome: string
          nota_media: number
          origem: string
          telefone: string
        }[]
      }
      pedido_cancelar_devolver_estoque: {
        Args: { p_pedido_id: string }
        Returns: undefined
      }
      pedido_confirmar_entrega: {
        Args: { p_codigo: string; p_pedido_id: string }
        Returns: number
      }
      pedido_registrar_contato: {
        Args: { p_pedido_id: string; p_telefone: string }
        Returns: undefined
      }
      preco_faixa: {
        Args: { p_base: number; p_produto_id: string; p_qtd: number }
        Returns: number
      }
      publicar_corrida: {
        Args: {
          p_descricao_carga: string
          p_destino_cep: string
          p_destino_endereco: string
          p_janela_fim: string
          p_janela_inicio: string
          p_modo: string
          p_origem_cep: string
          p_origem_endereco: string
          p_pedido_id?: string
          p_peso_kg: number
          p_urgencia: string
          p_volume_m3: number
        }
        Returns: string
      }
      publicar_leilao_fabricante: {
        Args: {
          p_categoria_id: string
          p_descricao: string
          p_janela_fim: string
          p_prazo_desejado: string
          p_titulo: string
          p_volume: string
        }
        Returns: string
      }
      resolver_usuario_por_contato: {
        Args: { p_contato: string }
        Returns: string
      }
      salvar_perfil_comprador_pj: {
        Args: {
          p_documento: string
          p_produtor_rural: boolean
          p_razao_social: string
          p_tipo_documento: string
        }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
