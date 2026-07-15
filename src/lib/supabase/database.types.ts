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
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      // Tipos da migration 0014 (checkout) mantidos à mão junto com os ajustes
      // de nulabilidade das views — regenerar com `gen types` os clobbera.
      asaas_clientes: {
        Row: {
          user_id: string
          customer_id: string
          cpf_cnpj: string
          created_at: string
        }
        Insert: {
          user_id: string
          customer_id: string
          cpf_cnpj: string
          created_at?: string
        }
        Update: {
          user_id?: string
          customer_id?: string
          cpf_cnpj?: string
          created_at?: string
        }
        Relationships: []
      }
      faixas_cep: {
        Row: {
          id: string
          cep_inicial: number
          cep_final: number
          percentual: number
          kg_adicional: number
          ativo: boolean
          loja_id: string | null
        }
        Insert: {
          id?: string
          cep_inicial: number
          cep_final: number
          percentual?: number
          kg_adicional?: number
          ativo?: boolean
          loja_id?: string | null
        }
        Update: {
          id?: string
          cep_inicial?: number
          cep_final?: number
          percentual?: number
          kg_adicional?: number
          ativo?: boolean
          loja_id?: string | null
        }
        Relationships: []
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
      admins: {
        Row: {
          created_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
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
            referencedRelation: "logistica_itens"
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
      perfis_compradores: {
        Row: {
          user_id: string
          tipo_documento: string | null
          documento: string | null
          produtor_rural: boolean
          razao_social: string | null
          criado_em: string
          atualizado_em: string
        }
        Insert: {
          user_id: string
          tipo_documento?: string | null
          documento?: string | null
          produtor_rural?: boolean
          razao_social?: string | null
          criado_em?: string
          atualizado_em?: string
        }
        Update: {
          user_id?: string
          tipo_documento?: string | null
          documento?: string | null
          produtor_rural?: boolean
          razao_social?: string | null
          criado_em?: string
          atualizado_em?: string
        }
        Relationships: []
      }
      auditoria_eventos: {
        Row: {
          id: string
          ator_id: string | null
          ator_papel: string
          acao: string
          tabela: string
          registro_id: string | null
          dados_antes: Json | null
          dados_depois: Json | null
          criado_em: string
        }
        Insert: {
          id?: string
          ator_id?: string | null
          ator_papel?: string
          acao: string
          tabela: string
          registro_id?: string | null
          dados_antes?: Json | null
          dados_depois?: Json | null
          criado_em?: string
        }
        Update: {
          id?: string
          ator_id?: string | null
          ator_papel?: string
          acao?: string
          tabela?: string
          registro_id?: string | null
          dados_antes?: Json | null
          dados_depois?: Json | null
          criado_em?: string
        }
        Relationships: []
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
      pedidos: {
        Row: {
          asaas_cobranca_id: string | null
          bubble_id: string | null
          cliente_id: string | null
          cliente_nome: string | null
          created_at: string
          data: string
          dt_pagamento: string | null
          forma_pagamento: string | null
          id: string
          id_venda: string
          link_cobranca: string | null
          loja_id: string
          repasse_ind24: number | null
          status_pedido: string
          valor_pedido: number
          valor_recebido_industria: string | null
        }
        Insert: {
          asaas_cobranca_id?: string | null
          bubble_id?: string | null
          cliente_id?: string | null
          cliente_nome?: string | null
          created_at?: string
          data?: string
          dt_pagamento?: string | null
          forma_pagamento?: string | null
          id?: string
          id_venda: string
          link_cobranca?: string | null
          loja_id: string
          repasse_ind24?: number | null
          status_pedido?: string
          valor_pedido?: number
          valor_recebido_industria?: string | null
        }
        Update: {
          asaas_cobranca_id?: string | null
          bubble_id?: string | null
          cliente_id?: string | null
          cliente_nome?: string | null
          created_at?: string
          data?: string
          dt_pagamento?: string | null
          forma_pagamento?: string | null
          id?: string
          id_venda?: string
          link_cobranca?: string | null
          loja_id?: string
          repasse_ind24?: number | null
          status_pedido?: string
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
          id: string
          largura: number | null
          loja_id: string
          nome: string
          permite_afiliacao: boolean
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
          id?: string
          largura?: number | null
          loja_id: string
          nome: string
          permite_afiliacao?: boolean
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
          id?: string
          largura?: number | null
          loja_id?: string
          nome?: string
          permite_afiliacao?: boolean
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
            foreignKeyName: "parcerias_representante_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
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
    }
    Views: {
      // Catálogo público sem PII (migration 0012). Colunas manuais até o
      // próximo `gen types` pós-aplicação da migration.
      // Ganhos do afiliado sem endereço do comprador (migration 0013).
      afiliado_ganhos: {
        Row: {
          id: string
          pedido_id: string
          produto_id: string | null
          produto_nome: string | null
          quantidade: number
          valor: number
          repasse_afiliado: number
          pago: boolean
          afiliado_id: string | null
        }
        Relationships: []
      }
      // Pedido/itens do comprador sem colunas financeiras internas nem Asaas
      // cru (migration 0025).
      pedidos_cliente: {
        Row: {
          id: string
          id_venda: string
          data: string
          status_pedido: string
          valor_pedido: number
          forma_pagamento: string | null
          link_cobranca: string | null
          asaas_cobranca_id: string | null
        }
        Relationships: []
      }
      linha_itens_cliente: {
        Row: {
          id: string
          pedido_id: string
          produto_nome: string | null
          quantidade: number
          valor: number
          valor_frete: number | null
          retirar_na_loja: boolean
          entrega_rua: string | null
          entrega_numero: string | null
          entrega_bairro: string | null
          entrega_cidade: string | null
          entrega_cep: string | null
        }
        Relationships: []
      }
      lojas_vitrine: {
        Row: {
          id: string
          nome: string
          descricao: string | null
          logotipo_url: string | null
          banner_url: string | null
          whatsapp: string | null
          cidade: string | null
          estado: string | null
          situacao: string
          valor_pedido_minimo: number | null
          permite_retirada_na_loja: boolean
        }
        Relationships: []
      }
      // Pedidos/itens operacionais do afiliado logístico sem financeiro/PII (0014).
      logistica_pedidos: {
        Row: {
          id: string
          id_venda: string | null
          loja_id: string
          data: string | null
          status_pedido: string | null
        }
        Relationships: []
      }
      logistica_itens: {
        Row: {
          id: string
          pedido_id: string
          produto_nome: string | null
          quantidade: number
          valor: number
          entrega_cep: string | null
          entrega_rua: string | null
          entrega_bairro: string | null
          entrega_numero: string | null
          entrega_cidade: string | null
          entrega_complemento: string | null
          retirar_na_loja: boolean
        }
        Relationships: []
      }
    }
    Functions: {
      admin_list_users: {
        Args: never
        Returns: {
          id: string
          email: string
          criado_em: string
          ultimo_login: string | null
          eh_admin: boolean
          loja_nome: string | null
        }[]
      }
      eh_afiliado_logistica: { Args: { p_loja: string }; Returns: boolean }
      is_admin: { Args: never; Returns: boolean }
      checkout_criar_pedido: {
        Args: { itens: Json; entrega: Json; forma_pagamento: string }
        Returns: string
      }
      alterar_chave_pix_loja: {
        Args: { p_loja_id: string; p_chave_pix: string; p_tipo_chave_pix: string }
        Returns: undefined
      }
      confirmar_chave_pix: { Args: { p_loja_id: string }; Returns: undefined }
      chave_pix_elegivel_repasse: { Args: { p_loja_id: string }; Returns: boolean }
      salvar_perfil_comprador_pj: {
        Args: {
          p_tipo_documento: string
          p_documento: string
          p_produtor_rural: boolean
          p_razao_social: string | null
        }
        Returns: undefined
      }
      preco_faixa: {
        Args: { p_base: number; p_produto_id: string; p_qtd: number }
        Returns: number
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
