export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
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
        Update: Partial<Database["public"]["Tables"]["acessos"]["Insert"]>
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
        Update: Partial<Database["public"]["Tables"]["admins"]["Insert"]>
        Relationships: []
      }
      afiliacoes: {
        Row: {
          afiliado_id: string | null
          created_at: string
          id: string
          identificador: string | null
          porcentagem: number
          produto_id: string
          status: string
        }
        Insert: {
          afiliado_id?: string | null
          created_at?: string
          id?: string
          identificador?: string | null
          porcentagem: number
          produto_id: string
          status?: string
        }
        Update: Partial<Database["public"]["Tables"]["afiliacoes"]["Insert"]>
        Relationships: []
      }
      categorias: {
        Row: { id: string; nome: string }
        Insert: { id?: string; nome: string }
        Update: { id?: string; nome?: string }
        Relationships: []
      }
      centros_distribuicao: {
        Row: {
          created_at: string
          id: string
          localizacao: string | null
          loja_id: string
          nome: string
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          localizacao?: string | null
          loja_id: string
          nome: string
          status?: string
        }
        Update: Partial<Database["public"]["Tables"]["centros_distribuicao"]["Insert"]>
        Relationships: []
      }
      linha_itens: {
        Row: {
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
        }
        Insert: {
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
        }
        Update: Partial<Database["public"]["Tables"]["linha_itens"]["Insert"]>
        Relationships: []
      }
      lojas: {
        Row: {
          bairro: string | null
          banner_url: string | null
          cep: string | null
          chave_pix: string | null
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
          valor_pedido_minimo: number | null
          tipo_chave_pix: string | null
          whatsapp: string | null
        }
        Insert: {
          bairro?: string | null
          banner_url?: string | null
          cep?: string | null
          chave_pix?: string | null
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
          valor_pedido_minimo?: number | null
          tipo_chave_pix?: string | null
          whatsapp?: string | null
        }
        Update: Partial<Database["public"]["Tables"]["lojas"]["Insert"]>
        Relationships: []
      }
      pedidos: {
        Row: {
          asaas_cobranca_id: string | null
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
        Update: Partial<Database["public"]["Tables"]["pedidos"]["Insert"]>
        Relationships: []
      }
      produto_centros: {
        Row: { centro_id: string; produto_id: string }
        Insert: { centro_id: string; produto_id: string }
        Update: { centro_id?: string; produto_id?: string }
        Relationships: []
      }
      produto_imagens: {
        Row: { id: string; ordem: number; produto_id: string; url: string }
        Insert: { id?: string; ordem?: number; produto_id: string; url: string }
        Update: Partial<Database["public"]["Tables"]["produto_imagens"]["Insert"]>
        Relationships: []
      }
      produtos: {
        Row: {
          altura: number | null
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
        Update: Partial<Database["public"]["Tables"]["produtos"]["Insert"]>
        Relationships: []
      }
      promocoes_progressivas: {
        Row: { ativo: boolean; created_at: string; faixas: Json; id: string; produto_id: string }
        Insert: { ativo?: boolean; created_at?: string; faixas?: Json; id?: string; produto_id: string }
        Update: Partial<Database["public"]["Tables"]["promocoes_progressivas"]["Insert"]>
        Relationships: []
      }
      subcategorias: {
        Row: { categoria_id: string | null; id: string; nome: string }
        Insert: { categoria_id?: string | null; id?: string; nome: string }
        Update: { categoria_id?: string | null; id?: string; nome?: string }
        Relationships: []
      }
      vendas_futuras: {
        Row: { created_at: string; estoque: number | null; id: string; previsao: string | null; produto_id: string }
        Insert: { created_at?: string; estoque?: number | null; id?: string; previsao?: string | null; produto_id: string }
        Update: Partial<Database["public"]["Tables"]["vendas_futuras"]["Insert"]>
        Relationships: []
      }
    }
    Views: { [_ in never]: never }
    Functions: {
      is_admin: { Args: never; Returns: boolean }
    }
    Enums: { [_ in never]: never }
    CompositeTypes: { [_ in never]: never }
  }
}

type PublicSchema = Database["public"]

export type Tables<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Row"]
export type TablesInsert<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Insert"]
export type TablesUpdate<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Update"]
