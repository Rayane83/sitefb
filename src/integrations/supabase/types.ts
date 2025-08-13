export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      archives: {
        Row: {
          created_at: string
          date: string | null
          entreprise_key: string | null
          guild_id: string
          id: string
          montant: number | null
          payload: Json | null
          statut: string | null
          type: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          date?: string | null
          entreprise_key?: string | null
          guild_id: string
          id?: string
          montant?: number | null
          payload?: Json | null
          statut?: string | null
          type?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          date?: string | null
          entreprise_key?: string | null
          guild_id?: string
          id?: string
          montant?: number | null
          payload?: Json | null
          statut?: string | null
          type?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      blanchiment_global: {
        Row: {
          created_at: string
          guild_id: string
          perc_entreprise: number | null
          perc_groupe: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          guild_id: string
          perc_entreprise?: number | null
          perc_groupe?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          guild_id?: string
          perc_entreprise?: number | null
          perc_groupe?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      blanchiment_rows: {
        Row: {
          created_at: string
          date_recu: string | null
          date_rendu: string | null
          donneur_id: string | null
          duree: number | null
          employe: string | null
          entreprise_key: string
          groupe: string | null
          guild_id: string
          id: string
          recep_id: string | null
          somme: number | null
          statut: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          date_recu?: string | null
          date_rendu?: string | null
          donneur_id?: string | null
          duree?: number | null
          employe?: string | null
          entreprise_key: string
          groupe?: string | null
          guild_id: string
          id?: string
          recep_id?: string | null
          somme?: number | null
          statut?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          date_recu?: string | null
          date_rendu?: string | null
          donneur_id?: string | null
          duree?: number | null
          employe?: string | null
          entreprise_key?: string
          groupe?: string | null
          guild_id?: string
          id?: string
          recep_id?: string | null
          somme?: number | null
          statut?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      blanchiment_settings: {
        Row: {
          created_at: string
          enabled: boolean
          entreprise_key: string
          guild_id: string
          id: string
          perc_entreprise: number | null
          perc_groupe: number | null
          updated_at: string
          use_global: boolean
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          entreprise_key: string
          guild_id: string
          id?: string
          perc_entreprise?: number | null
          perc_groupe?: number | null
          updated_at?: string
          use_global?: boolean
        }
        Update: {
          created_at?: string
          enabled?: boolean
          entreprise_key?: string
          guild_id?: string
          id?: string
          perc_entreprise?: number | null
          perc_groupe?: number | null
          updated_at?: string
          use_global?: boolean
        }
        Relationships: []
      }
      company_configs: {
        Row: {
          config: Json
          created_at: string
          entreprise_key: string
          guild_id: string
          id: string
          updated_at: string
        }
        Insert: {
          config?: Json
          created_at?: string
          entreprise_key: string
          guild_id: string
          id?: string
          updated_at?: string
        }
        Update: {
          config?: Json
          created_at?: string
          entreprise_key?: string
          guild_id?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      company_prime_tiers: {
        Row: {
          created_at: string
          entreprise_key: string
          guild_id: string
          id: string
          prime: number
          seuil: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          entreprise_key: string
          guild_id: string
          id?: string
          prime: number
          seuil: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          entreprise_key?: string
          guild_id?: string
          id?: string
          prime?: number
          seuil?: number
          updated_at?: string
        }
        Relationships: []
      }
      discord_config: {
        Row: {
          created_at: string
          data: Json
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          data?: Json
          id?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          data?: Json
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      dotation_reports: {
        Row: {
          archived_at: string | null
          created_at: string
          created_by: string | null
          employees_count: number | null
          entreprise_key: string
          guild_id: string
          id: string
          solde_actuel: number
          totals: Json | null
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          created_by?: string | null
          employees_count?: number | null
          entreprise_key: string
          guild_id: string
          id?: string
          solde_actuel?: number
          totals?: Json | null
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          created_by?: string | null
          employees_count?: number | null
          entreprise_key?: string
          guild_id?: string
          id?: string
          solde_actuel?: number
          totals?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      dotation_rows: {
        Row: {
          ca_total: number
          facture: number
          id: string
          name: string
          prime: number
          report_id: string
          run: number
          salaire: number
          vente: number
        }
        Insert: {
          ca_total?: number
          facture?: number
          id?: string
          name: string
          prime?: number
          report_id: string
          run?: number
          salaire?: number
          vente?: number
        }
        Update: {
          ca_total?: number
          facture?: number
          id?: string
          name?: string
          prime?: number
          report_id?: string
          run?: number
          salaire?: number
          vente?: number
        }
        Relationships: [
          {
            foreignKeyName: "dotation_rows_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "dotation_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      enterprises: {
        Row: {
          created_at: string
          employee_role_id: string | null
          enterprise_guild_id: string | null
          guild_id: string
          id: string
          key: string
          name: string
          role_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          employee_role_id?: string | null
          enterprise_guild_id?: string | null
          guild_id: string
          id?: string
          key: string
          name: string
          role_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          employee_role_id?: string | null
          enterprise_guild_id?: string | null
          guild_id?: string
          id?: string
          key?: string
          name?: string
          role_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      grade_rules: {
        Row: {
          created_at: string
          entreprise_key: string
          grade: string
          guild_id: string
          id: string
          pourcentage_ca: number
          role_discord_id: string | null
          taux_horaire: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          entreprise_key: string
          grade: string
          guild_id: string
          id?: string
          pourcentage_ca?: number
          role_discord_id?: string | null
          taux_horaire?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          entreprise_key?: string
          grade?: string
          guild_id?: string
          id?: string
          pourcentage_ca?: number
          role_discord_id?: string | null
          taux_horaire?: number
          updated_at?: string
        }
        Relationships: []
      }
      tax_brackets: {
        Row: {
          created_at: string
          entreprise_key: string
          guild_id: string
          id: string
          max: number | null
          min: number
          pr_max_emp: number | null
          pr_max_pat: number | null
          pr_min_emp: number | null
          pr_min_pat: number | null
          sal_max_emp: number | null
          sal_max_pat: number | null
          sal_min_emp: number | null
          sal_min_pat: number | null
          taux: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          entreprise_key: string
          guild_id: string
          id?: string
          max?: number | null
          min: number
          pr_max_emp?: number | null
          pr_max_pat?: number | null
          pr_min_emp?: number | null
          pr_min_pat?: number | null
          sal_max_emp?: number | null
          sal_max_pat?: number | null
          sal_min_emp?: number | null
          sal_min_pat?: number | null
          taux: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          entreprise_key?: string
          guild_id?: string
          id?: string
          max?: number | null
          min?: number
          pr_max_emp?: number | null
          pr_max_pat?: number | null
          pr_min_emp?: number | null
          pr_min_pat?: number | null
          sal_max_emp?: number | null
          sal_max_pat?: number | null
          sal_min_emp?: number | null
          sal_min_pat?: number | null
          taux?: number
          updated_at?: string
        }
        Relationships: []
      }
      wealth_brackets: {
        Row: {
          created_at: string
          entreprise_key: string
          guild_id: string
          id: string
          max: number | null
          min: number
          taux: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          entreprise_key: string
          guild_id: string
          id?: string
          max?: number | null
          min: number
          taux: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          entreprise_key?: string
          guild_id?: string
          id?: string
          max?: number | null
          min?: number
          taux?: number
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
