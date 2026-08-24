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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      categorias_despesa: {
        Row: {
          cor: string | null
          created_at: string
          empresa_id: string | null
          id: string
          nome: string
          padrao: boolean
        }
        Insert: {
          cor?: string | null
          created_at?: string
          empresa_id?: string | null
          id?: string
          nome: string
          padrao?: boolean
        }
        Update: {
          cor?: string | null
          created_at?: string
          empresa_id?: string | null
          id?: string
          nome?: string
          padrao?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "categorias_despesa_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      compras: {
        Row: {
          codigo: string | null
          created_at: string
          custo_total: number
          custo_unitario: number
          data: string
          data_pagamento: string | null
          data_vencimento: string | null
          descricao: string | null
          empresa_id: string | null
          forma_pagamento: string
          fornecedor: string | null
          id: string
          produto_id: string | null
          quantidade: number
          status_pagamento: string
        }
        Insert: {
          codigo?: string | null
          created_at?: string
          custo_total?: number
          custo_unitario?: number
          data?: string
          data_pagamento?: string | null
          data_vencimento?: string | null
          descricao?: string | null
          empresa_id?: string | null
          forma_pagamento?: string
          fornecedor?: string | null
          id?: string
          produto_id?: string | null
          quantidade?: number
          status_pagamento?: string
        }
        Update: {
          codigo?: string | null
          created_at?: string
          custo_total?: number
          custo_unitario?: number
          data?: string
          data_pagamento?: string | null
          data_vencimento?: string | null
          descricao?: string | null
          empresa_id?: string | null
          forma_pagamento?: string
          fornecedor?: string | null
          id?: string
          produto_id?: string | null
          quantidade?: number
          status_pagamento?: string
        }
        Relationships: [
          {
            foreignKeyName: "compras_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compras_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
        ]
      }
      despesas: {
        Row: {
          categoria: string | null
          centro_custo: string | null
          created_at: string
          data: string
          descricao: string
          empresa_id: string | null
          forma_pagamento: string | null
          id: string
          observacoes: string | null
          status: string
          updated_at: string
          user_id: string | null
          valor: number
        }
        Insert: {
          categoria?: string | null
          centro_custo?: string | null
          created_at?: string
          data?: string
          descricao: string
          empresa_id?: string | null
          forma_pagamento?: string | null
          id?: string
          observacoes?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
          valor?: number
        }
        Update: {
          categoria?: string | null
          centro_custo?: string | null
          created_at?: string
          data?: string
          descricao?: string
          empresa_id?: string | null
          forma_pagamento?: string | null
          id?: string
          observacoes?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "despesas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      empresa_usuarios: {
        Row: {
          created_at: string
          empresa_id: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          empresa_id: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          empresa_id?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "empresa_usuarios_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      empresas: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          nome: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          nome: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          nome?: string
        }
        Relationships: []
      }
      movimentacoes: {
        Row: {
          categoria: string | null
          created_at: string
          data: string
          descricao: string | null
          empresa_id: string | null
          entrada: number
          id: string
          referencia_id: string | null
          saida: number
          tipo: string
        }
        Insert: {
          categoria?: string | null
          created_at?: string
          data: string
          descricao?: string | null
          empresa_id?: string | null
          entrada?: number
          id?: string
          referencia_id?: string | null
          saida?: number
          tipo: string
        }
        Update: {
          categoria?: string | null
          created_at?: string
          data?: string
          descricao?: string | null
          empresa_id?: string | null
          entrada?: number
          id?: string
          referencia_id?: string | null
          saida?: number
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "movimentacoes_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      produtos: {
        Row: {
          ativo: boolean
          categoria: string | null
          codigo: string
          created_at: string
          custo_compra: number
          descricao: string
          empresa_id: string | null
          estoque_atual: number
          estoque_minimo: number
          fornecedor: string | null
          id: string
          marca: string | null
          nome: string | null
          observacoes: string | null
          preco_venda: number
          unidade: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          categoria?: string | null
          codigo: string
          created_at?: string
          custo_compra?: number
          descricao: string
          empresa_id?: string | null
          estoque_atual?: number
          estoque_minimo?: number
          fornecedor?: string | null
          id?: string
          marca?: string | null
          nome?: string | null
          observacoes?: string | null
          preco_venda?: number
          unidade?: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          categoria?: string | null
          codigo?: string
          created_at?: string
          custo_compra?: number
          descricao?: string
          empresa_id?: string | null
          estoque_atual?: number
          estoque_minimo?: number
          fornecedor?: string | null
          id?: string
          marca?: string | null
          nome?: string | null
          observacoes?: string | null
          preco_venda?: number
          unidade?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "produtos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vendas: {
        Row: {
          cliente: string | null
          codigo: string | null
          created_at: string
          custo: number
          data: string
          descricao: string | null
          despesas: number
          empresa_id: string | null
          id: string
          lucro: number
          margem: number
          observacoes: string | null
          preco_venda: number
          produto_id: string | null
          quantidade: number
          valor_unitario: number
        }
        Insert: {
          cliente?: string | null
          codigo?: string | null
          created_at?: string
          custo?: number
          data?: string
          descricao?: string | null
          despesas?: number
          empresa_id?: string | null
          id?: string
          lucro?: number
          margem?: number
          observacoes?: string | null
          preco_venda?: number
          produto_id?: string | null
          quantidade?: number
          valor_unitario?: number
        }
        Update: {
          cliente?: string | null
          codigo?: string | null
          created_at?: string
          custo?: number
          data?: string
          descricao?: string | null
          despesas?: number
          empresa_id?: string | null
          id?: string
          lucro?: number
          margem?: number
          observacoes?: string | null
          preco_venda?: number
          produto_id?: string | null
          quantidade?: number
          valor_unitario?: number
        }
        Relationships: [
          {
            foreignKeyName: "vendas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendas_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      atualizar_despesa: {
        Args: {
          p_categoria?: string
          p_centro_custo?: string
          p_data: string
          p_descricao: string
          p_despesa_id: string
          p_forma_pagamento?: string
          p_observacoes?: string
          p_status?: string
          p_valor: number
        }
        Returns: undefined
      }
      excluir_compra: { Args: { p_compra_id: string }; Returns: undefined }
      excluir_despesa: { Args: { p_despesa_id: string }; Returns: undefined }
      has_empresa_role: {
        Args: {
          _empresa_id: string
          _role: Database["public"]["Enums"]["app_role"]
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_empresa_member: { Args: { _empresa_id: string }; Returns: boolean }
      pagar_compra: { Args: { p_compra_id: string }; Returns: undefined }
      registrar_compra: {
        Args: {
          p_custo_unitario: number
          p_data?: string
          p_data_vencimento?: string
          p_empresa_id: string
          p_forma_pagamento?: string
          p_fornecedor?: string
          p_produto_id: string
          p_quantidade: number
        }
        Returns: string
      }
      registrar_despesa: {
        Args: {
          p_categoria?: string
          p_centro_custo?: string
          p_data?: string
          p_descricao: string
          p_forma_pagamento?: string
          p_observacoes?: string
          p_status?: string
          p_valor: number
        }
        Returns: string
      }
      registrar_venda: {
        Args: {
          p_cliente?: string
          p_desconto?: number
          p_empresa_id: string
          p_frete?: number
          p_observacoes?: string
          p_produto_id: string
          p_quantidade: number
          p_valor_unitario: number
        }
        Returns: string
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
    Enums: {
      app_role: ["admin", "user"],
    },
  },
} as const
