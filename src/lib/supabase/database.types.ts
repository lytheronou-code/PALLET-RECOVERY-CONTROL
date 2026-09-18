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
      counterparties: {
        Row: {
          active: boolean
          address_line: string | null
          city: string | null
          code: string | null
          counterparty_type: string
          country_code: string
          created_at: string
          email: string | null
          id: string
          legal_name: string
          organization_id: string
          phone: string | null
          postal_code: string | null
          province: string | null
          vat_number: string | null
        }
        Insert: {
          active?: boolean
          address_line?: string | null
          city?: string | null
          code?: string | null
          counterparty_type?: string
          country_code?: string
          created_at?: string
          email?: string | null
          id?: string
          legal_name: string
          organization_id: string
          phone?: string | null
          postal_code?: string | null
          province?: string | null
          vat_number?: string | null
        }
        Update: {
          active?: boolean
          address_line?: string | null
          city?: string | null
          code?: string | null
          counterparty_type?: string
          country_code?: string
          created_at?: string
          email?: string | null
          id?: string
          legal_name?: string
          organization_id?: string
          phone?: string | null
          postal_code?: string | null
          province?: string | null
          vat_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "counterparties_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      import_batches: {
        Row: {
          completed_at: string | null
          created_at: string
          filename: string
          id: string
          imported_by: string | null
          organization_id: string
          rows_invalid: number
          rows_total: number
          rows_valid: number
          source_type: string
          status: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          filename: string
          id?: string
          imported_by?: string | null
          organization_id: string
          rows_invalid?: number
          rows_total?: number
          rows_valid?: number
          source_type: string
          status?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          filename?: string
          id?: string
          imported_by?: string | null
          organization_id?: string
          rows_invalid?: number
          rows_total?: number
          rows_valid?: number
          source_type?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "import_batches_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_members: {
        Row: {
          created_at: string
          id: string
          organization_id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id: string
          role: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_members_profile_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          id: string
          name: string
          slug: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          slug: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      pallet_movements: {
        Row: {
          correction_of_movement_id: string | null
          correction_reason: string | null
          counterparty_id: string
          created_at: string
          created_by: string | null
          direction: string
          document_number: string | null
          document_type: string | null
          id: string
          movement_date: string
          notes: string | null
          organization_id: string
          pallet_type_id: string
          quantity: number
          site_id: string | null
          source_batch_id: string | null
          voucher_number: string | null
        }
        Insert: {
          correction_of_movement_id?: string | null
          correction_reason?: string | null
          counterparty_id: string
          created_at?: string
          created_by?: string | null
          direction: string
          document_number?: string | null
          document_type?: string | null
          id?: string
          movement_date: string
          notes?: string | null
          organization_id: string
          pallet_type_id: string
          quantity: number
          site_id?: string | null
          source_batch_id?: string | null
          voucher_number?: string | null
        }
        Update: {
          correction_of_movement_id?: string | null
          correction_reason?: string | null
          counterparty_id?: string
          created_at?: string
          created_by?: string | null
          direction?: string
          document_number?: string | null
          document_type?: string | null
          id?: string
          movement_date?: string
          notes?: string | null
          organization_id?: string
          pallet_type_id?: string
          quantity?: number
          site_id?: string | null
          source_batch_id?: string | null
          voucher_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pallet_movements_counterparty_id_fkey"
            columns: ["counterparty_id"]
            isOneToOne: false
            referencedRelation: "counterparties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pallet_movements_org_correction_fk"
            columns: ["organization_id", "correction_of_movement_id"]
            isOneToOne: false
            referencedRelation: "pallet_movements"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "pallet_movements_org_counterparty_fk"
            columns: ["organization_id", "counterparty_id"]
            isOneToOne: false
            referencedRelation: "counterparties"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "pallet_movements_org_pallet_type_fk"
            columns: ["organization_id", "pallet_type_id"]
            isOneToOne: false
            referencedRelation: "pallet_types"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "pallet_movements_org_site_fk"
            columns: ["organization_id", "site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "pallet_movements_org_source_batch_fk"
            columns: ["organization_id", "source_batch_id"]
            isOneToOne: false
            referencedRelation: "import_batches"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "pallet_movements_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pallet_movements_pallet_type_id_fkey"
            columns: ["pallet_type_id"]
            isOneToOne: false
            referencedRelation: "pallet_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pallet_movements_source_batch_id_fkey"
            columns: ["source_batch_id"]
            isOneToOne: false
            referencedRelation: "import_batches"
            referencedColumns: ["id"]
          },
        ]
      }
      pallet_types: {
        Row: {
          active: boolean
          code: string
          created_at: string
          description: string
          id: string
          organization_id: string
          unit_value: number
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          description: string
          id?: string
          organization_id: string
          unit_value?: number
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          description?: string
          id?: string
          organization_id?: string
          unit_value?: number
        }
        Relationships: [
          {
            foreignKeyName: "pallet_types_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          email: string
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          email: string
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          email?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      recovery_cases: {
        Row: {
          assignee_user_id: string | null
          counterparty_id: string
          created_at: string
          due_date: string | null
          id: string
          notes: string | null
          opened_at: string
          organization_id: string
          pallet_type_id: string
          priority: string
          quantity_claimed: number
          quantity_recovered: number
          reference: string
          site_id: string | null
          status: string
          unit_value_snapshot: number
          updated_at: string
          voucher_id: string | null
        }
        Insert: {
          assignee_user_id?: string | null
          counterparty_id: string
          created_at?: string
          due_date?: string | null
          id?: string
          notes?: string | null
          opened_at?: string
          organization_id: string
          pallet_type_id: string
          priority?: string
          quantity_claimed: number
          quantity_recovered?: number
          reference: string
          site_id?: string | null
          status?: string
          unit_value_snapshot?: number
          updated_at?: string
          voucher_id?: string | null
        }
        Update: {
          assignee_user_id?: string | null
          counterparty_id?: string
          created_at?: string
          due_date?: string | null
          id?: string
          notes?: string | null
          opened_at?: string
          organization_id?: string
          pallet_type_id?: string
          priority?: string
          quantity_claimed?: number
          quantity_recovered?: number
          reference?: string
          site_id?: string | null
          status?: string
          unit_value_snapshot?: number
          updated_at?: string
          voucher_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recovery_cases_assignee_profile_fkey"
            columns: ["assignee_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recovery_cases_counterparty_id_fkey"
            columns: ["counterparty_id"]
            isOneToOne: false
            referencedRelation: "counterparties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recovery_cases_org_counterparty_fk"
            columns: ["organization_id", "counterparty_id"]
            isOneToOne: false
            referencedRelation: "counterparties"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "recovery_cases_org_pallet_type_fk"
            columns: ["organization_id", "pallet_type_id"]
            isOneToOne: false
            referencedRelation: "pallet_types"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "recovery_cases_org_site_fk"
            columns: ["organization_id", "site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "recovery_cases_org_voucher_context_fk"
            columns: [
              "organization_id",
              "voucher_id",
              "counterparty_id",
              "pallet_type_id",
            ]
            isOneToOne: false
            referencedRelation: "vouchers"
            referencedColumns: [
              "organization_id",
              "id",
              "counterparty_id",
              "pallet_type_id",
            ]
          },
          {
            foreignKeyName: "recovery_cases_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recovery_cases_pallet_type_id_fkey"
            columns: ["pallet_type_id"]
            isOneToOne: false
            referencedRelation: "pallet_types"
            referencedColumns: ["id"]
          },
        ]
      }
      recovery_events: {
        Row: {
          actor_user_id: string | null
          created_at: string
          event_type: string
          id: string
          notes: string | null
          occurred_at: string
          organization_id: string
          quantity: number | null
          recovery_case_id: string
        }
        Insert: {
          actor_user_id?: string | null
          created_at?: string
          event_type: string
          id?: string
          notes?: string | null
          occurred_at?: string
          organization_id: string
          quantity?: number | null
          recovery_case_id: string
        }
        Update: {
          actor_user_id?: string | null
          created_at?: string
          event_type?: string
          id?: string
          notes?: string | null
          occurred_at?: string
          organization_id?: string
          quantity?: number | null
          recovery_case_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recovery_events_org_case_fk"
            columns: ["organization_id", "recovery_case_id"]
            isOneToOne: false
            referencedRelation: "recovery_cases"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "recovery_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recovery_events_recovery_case_id_fkey"
            columns: ["recovery_case_id"]
            isOneToOne: false
            referencedRelation: "recovery_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      sites: {
        Row: {
          active: boolean
          address_line: string | null
          city: string | null
          code: string | null
          counterparty_id: string | null
          country_code: string
          created_at: string
          id: string
          name: string
          organization_id: string
          postal_code: string | null
          province: string | null
        }
        Insert: {
          active?: boolean
          address_line?: string | null
          city?: string | null
          code?: string | null
          counterparty_id?: string | null
          country_code?: string
          created_at?: string
          id?: string
          name: string
          organization_id: string
          postal_code?: string | null
          province?: string | null
        }
        Update: {
          active?: boolean
          address_line?: string | null
          city?: string | null
          code?: string | null
          counterparty_id?: string | null
          country_code?: string
          created_at?: string
          id?: string
          name?: string
          organization_id?: string
          postal_code?: string | null
          province?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sites_org_counterparty_fk"
            columns: ["organization_id", "counterparty_id"]
            isOneToOne: false
            referencedRelation: "counterparties"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "sites_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      vouchers: {
        Row: {
          counterparty_id: string
          created_at: string
          id: string
          issue_date: string
          notes: string | null
          organization_id: string
          pallet_type_id: string
          quantity: number
          recovered_quantity: number
          recovery_due_date: string | null
          site_id: string | null
          source_batch_id: string | null
          status: string
          voucher_number: string
        }
        Insert: {
          counterparty_id: string
          created_at?: string
          id?: string
          issue_date: string
          notes?: string | null
          organization_id: string
          pallet_type_id: string
          quantity: number
          recovered_quantity?: number
          recovery_due_date?: string | null
          site_id?: string | null
          source_batch_id?: string | null
          status?: string
          voucher_number: string
        }
        Update: {
          counterparty_id?: string
          created_at?: string
          id?: string
          issue_date?: string
          notes?: string | null
          organization_id?: string
          pallet_type_id?: string
          quantity?: number
          recovered_quantity?: number
          recovery_due_date?: string | null
          site_id?: string | null
          source_batch_id?: string | null
          status?: string
          voucher_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "vouchers_counterparty_id_fkey"
            columns: ["counterparty_id"]
            isOneToOne: false
            referencedRelation: "counterparties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vouchers_org_counterparty_fk"
            columns: ["organization_id", "counterparty_id"]
            isOneToOne: false
            referencedRelation: "counterparties"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "vouchers_org_pallet_type_fk"
            columns: ["organization_id", "pallet_type_id"]
            isOneToOne: false
            referencedRelation: "pallet_types"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "vouchers_org_site_fk"
            columns: ["organization_id", "site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "vouchers_org_source_batch_fk"
            columns: ["organization_id", "source_batch_id"]
            isOneToOne: false
            referencedRelation: "import_batches"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "vouchers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vouchers_pallet_type_id_fkey"
            columns: ["pallet_type_id"]
            isOneToOne: false
            referencedRelation: "pallet_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vouchers_source_batch_id_fkey"
            columns: ["source_batch_id"]
            isOneToOne: false
            referencedRelation: "import_batches"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      bootstrap_organization: {
        Args: { p_name: string }
        Returns: {
          organization_id: string
          role: string
        }[]
      }
      is_org_member: { Args: { p_organization_id: string }; Returns: boolean }
      record_recovery_event: {
        Args: {
          p_case_id: string
          p_event_type: string
          p_notes?: string
          p_occurred_at?: string
          p_quantity?: number
        }
        Returns: {
          assignee_user_id: string | null
          counterparty_id: string
          created_at: string
          due_date: string | null
          id: string
          notes: string | null
          opened_at: string
          organization_id: string
          pallet_type_id: string
          priority: string
          quantity_claimed: number
          quantity_recovered: number
          reference: string
          site_id: string | null
          status: string
          unit_value_snapshot: number
          updated_at: string
          voucher_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "recovery_cases"
          isOneToOne: true
          isSetofReturn: false
        }
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
