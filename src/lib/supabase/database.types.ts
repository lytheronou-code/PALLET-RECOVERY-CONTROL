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
      client_portal_memberships: {
        Row: {
          active: boolean
          counterparty_id: string
          created_at: string
          id: string
          organization_id: string
          role: string
          user_id: string
        }
        Insert: {
          active?: boolean
          counterparty_id: string
          created_at?: string
          id?: string
          organization_id: string
          role?: string
          user_id: string
        }
        Update: {
          active?: boolean
          counterparty_id?: string
          created_at?: string
          id?: string
          organization_id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_portal_memberships_org_counterparty_fk"
            columns: ["organization_id", "counterparty_id"]
            isOneToOne: false
            referencedRelation: "counterparties"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "client_portal_memberships_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_portal_memberships_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      counterparties: {
        Row: {
          active: boolean
          address_line: string | null
          address_line_2: string | null
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
          registration_number: string | null
          tax_id: string | null
          trading_name: string | null
          vat_number: string | null
        }
        Insert: {
          active?: boolean
          address_line?: string | null
          address_line_2?: string | null
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
          registration_number?: string | null
          tax_id?: string | null
          trading_name?: string | null
          vat_number?: string | null
        }
        Update: {
          active?: boolean
          address_line?: string | null
          address_line_2?: string | null
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
          registration_number?: string | null
          tax_id?: string | null
          trading_name?: string | null
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
      document_events: {
        Row: {
          actor_user_id: string | null
          document_id: string
          event_type: string
          id: string
          notes: string | null
          occurred_at: string
          organization_id: string
        }
        Insert: {
          actor_user_id?: string | null
          document_id: string
          event_type: string
          id?: string
          notes?: string | null
          occurred_at?: string
          organization_id: string
        }
        Update: {
          actor_user_id?: string | null
          document_id?: string
          event_type?: string
          id?: string
          notes?: string | null
          occurred_at?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_events_actor_user_id_fkey"
            columns: ["actor_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_events_org_document_fk"
            columns: ["organization_id", "document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "document_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          counterparty_id: string
          created_at: string
          document_type: string
          file_size: number
          id: string
          mime_type: string
          movement_id: string | null
          notes: string | null
          organization_id: string
          original_filename: string
          recovery_case_id: string | null
          recovery_event_id: string | null
          site_id: string | null
          status: string
          storage_path: string
          updated_at: string
          uploaded_at: string
          uploaded_by: string | null
          visibility: string
          voucher_id: string | null
        }
        Insert: {
          counterparty_id: string
          created_at?: string
          document_type: string
          file_size: number
          id?: string
          mime_type: string
          movement_id?: string | null
          notes?: string | null
          organization_id: string
          original_filename: string
          recovery_case_id?: string | null
          recovery_event_id?: string | null
          site_id?: string | null
          status?: string
          storage_path: string
          updated_at?: string
          uploaded_at?: string
          uploaded_by?: string | null
          visibility?: string
          voucher_id?: string | null
        }
        Update: {
          counterparty_id?: string
          created_at?: string
          document_type?: string
          file_size?: number
          id?: string
          mime_type?: string
          movement_id?: string | null
          notes?: string | null
          organization_id?: string
          original_filename?: string
          recovery_case_id?: string | null
          recovery_event_id?: string | null
          site_id?: string | null
          status?: string
          storage_path?: string
          updated_at?: string
          uploaded_at?: string
          uploaded_by?: string | null
          visibility?: string
          voucher_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_org_counterparty_fk"
            columns: ["organization_id", "counterparty_id"]
            isOneToOne: false
            referencedRelation: "counterparties"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "documents_org_movement_fk"
            columns: ["organization_id", "movement_id"]
            isOneToOne: false
            referencedRelation: "pallet_movements"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "documents_org_recovery_case_fk"
            columns: ["organization_id", "recovery_case_id"]
            isOneToOne: false
            referencedRelation: "recovery_cases"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "documents_org_recovery_event_fk"
            columns: ["organization_id", "recovery_event_id"]
            isOneToOne: false
            referencedRelation: "recovery_events"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "documents_org_site_fk"
            columns: ["organization_id", "site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "documents_org_voucher_fk"
            columns: ["organization_id", "voucher_id"]
            isOneToOne: false
            referencedRelation: "vouchers"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "documents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
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
      organization_branding: {
        Row: {
          compact_logo_path: string | null
          created_at: string
          logo_path: string | null
          organization_id: string
          portal_name: string | null
          primary_color: string | null
          secondary_color: string | null
          support_email: string | null
          support_phone: string | null
          updated_at: string
          website: string | null
          welcome_message_en: string | null
          welcome_message_it: string | null
        }
        Insert: {
          compact_logo_path?: string | null
          created_at?: string
          logo_path?: string | null
          organization_id: string
          portal_name?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          support_email?: string | null
          support_phone?: string | null
          updated_at?: string
          website?: string | null
          welcome_message_en?: string | null
          welcome_message_it?: string | null
        }
        Update: {
          compact_logo_path?: string | null
          created_at?: string
          logo_path?: string | null
          organization_id?: string
          portal_name?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          support_email?: string | null
          support_phone?: string | null
          updated_at?: string
          website?: string | null
          welcome_message_en?: string | null
          welcome_message_it?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_branding_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_branding_localizations: {
        Row: {
          created_at: string
          locale: string
          organization_id: string
          updated_at: string
          welcome_message: string | null
        }
        Insert: {
          created_at?: string
          locale: string
          organization_id: string
          updated_at?: string
          welcome_message?: string | null
        }
        Update: {
          created_at?: string
          locale?: string
          organization_id?: string
          updated_at?: string
          welcome_message?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_branding_localizations_organization_id_fkey"
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
          address_line_1: string | null
          address_line_2: string | null
          city: string | null
          country_code: string | null
          created_at: string
          default_currency: string
          default_locale: string
          id: string
          legal_name: string | null
          name: string
          postal_code: string | null
          region: string | null
          registration_number: string | null
          slug: string
          support_email: string | null
          support_phone: string | null
          tax_id: string | null
          timezone: string
          trading_name: string | null
          vat_id: string | null
          website: string | null
        }
        Insert: {
          address_line_1?: string | null
          address_line_2?: string | null
          city?: string | null
          country_code?: string | null
          created_at?: string
          default_currency?: string
          default_locale?: string
          id?: string
          legal_name?: string | null
          name: string
          postal_code?: string | null
          region?: string | null
          registration_number?: string | null
          slug: string
          support_email?: string | null
          support_phone?: string | null
          tax_id?: string | null
          timezone?: string
          trading_name?: string | null
          vat_id?: string | null
          website?: string | null
        }
        Update: {
          address_line_1?: string | null
          address_line_2?: string | null
          city?: string | null
          country_code?: string | null
          created_at?: string
          default_currency?: string
          default_locale?: string
          id?: string
          legal_name?: string | null
          name?: string
          postal_code?: string | null
          region?: string | null
          registration_number?: string | null
          slug?: string
          support_email?: string | null
          support_phone?: string | null
          tax_id?: string | null
          timezone?: string
          trading_name?: string | null
          vat_id?: string | null
          website?: string | null
        }
        Relationships: []
      }
      pallet_movements: {
        Row: {
          correction_of_movement_id: string | null
          correction_reason: string | null
          correction_type: string | null
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
          correction_type?: string | null
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
          correction_type?: string | null
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
          preferred_locale: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          email: string
          id: string
          preferred_locale?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          email?: string
          id?: string
          preferred_locale?: string | null
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
          address_line_2: string | null
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
          address_line_2?: string | null
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
          address_line_2?: string | null
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
      admin_grant_client_portal_access: {
        Args: { p_counterparty_id: string; p_email: string }
        Returns: {
          active: boolean
          email: string
          id: string
          user_id: string
        }[]
      }
      admin_update_organization_branding: {
        Args: {
          p_compact_logo_path?: string
          p_logo_path?: string
          p_organization_id: string
          p_portal_name?: string
          p_primary_color?: string
          p_secondary_color?: string
          p_support_email?: string
          p_support_phone?: string
          p_website?: string
        }
        Returns: {
          compact_logo_path: string | null
          created_at: string
          logo_path: string | null
          organization_id: string
          portal_name: string | null
          primary_color: string | null
          secondary_color: string | null
          support_email: string | null
          support_phone: string | null
          updated_at: string
          website: string | null
          welcome_message_en: string | null
          welcome_message_it: string | null
        }
        SetofOptions: {
          from: "*"
          to: "organization_branding"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      admin_update_organization_branding_localization: {
        Args: {
          p_locale: string
          p_organization_id: string
          p_welcome_message?: string
        }
        Returns: {
          created_at: string
          locale: string
          organization_id: string
          updated_at: string
          welcome_message: string | null
        }
        SetofOptions: {
          from: "*"
          to: "organization_branding_localizations"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      admin_update_organization_company: {
        Args: {
          p_address_line_1?: string
          p_address_line_2?: string
          p_city?: string
          p_country_code?: string
          p_legal_name?: string
          p_organization_id: string
          p_postal_code?: string
          p_region?: string
          p_registration_number?: string
          p_support_email?: string
          p_support_phone?: string
          p_tax_id?: string
          p_trading_name?: string
          p_vat_id?: string
          p_website?: string
        }
        Returns: {
          address_line_1: string | null
          address_line_2: string | null
          city: string | null
          country_code: string | null
          created_at: string
          default_currency: string
          default_locale: string
          id: string
          legal_name: string | null
          name: string
          postal_code: string | null
          region: string | null
          registration_number: string | null
          slug: string
          support_email: string | null
          support_phone: string | null
          tax_id: string | null
          timezone: string
          trading_name: string | null
          vat_id: string | null
          website: string | null
        }
        SetofOptions: {
          from: "*"
          to: "organizations"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      admin_update_organization_localization: {
        Args: {
          p_default_currency?: string
          p_default_locale?: string
          p_organization_id: string
          p_timezone?: string
        }
        Returns: {
          address_line_1: string | null
          address_line_2: string | null
          city: string | null
          country_code: string | null
          created_at: string
          default_currency: string
          default_locale: string
          id: string
          legal_name: string | null
          name: string
          postal_code: string | null
          region: string | null
          registration_number: string | null
          slug: string
          support_email: string | null
          support_phone: string | null
          tax_id: string | null
          timezone: string
          trading_name: string | null
          vat_id: string | null
          website: string | null
        }
        SetofOptions: {
          from: "*"
          to: "organizations"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      bootstrap_organization: {
        Args: { p_name: string }
        Returns: {
          organization_id: string
          role: string
        }[]
      }
      correct_pallet_movement: {
        Args: {
          p_direction?: string
          p_document_number?: string
          p_document_type?: string
          p_movement_date?: string
          p_movement_id: string
          p_quantity?: number
          p_reason: string
          p_reversal_only?: boolean
        }
        Returns: {
          replacement_id: string
          reversal_id: string
        }[]
      }
      is_client_portal_member: {
        Args: { p_counterparty_id: string; p_organization_id: string }
        Returns: boolean
      }
      is_client_visible_document_path: {
        Args: { p_storage_path: string }
        Returns: boolean
      }
      is_org_member: { Args: { p_organization_id: string }; Returns: boolean }
      portal_counterparty_summary: {
        Args: never
        Returns: {
          active_recovery_cases_count: number
          estimated_exposure: number
          next_due_date: string
          open_vouchers_count: number
          outstanding_pallets: number
          recovered_pallets: number
          recovered_value: number
        }[]
      }
      portal_current_context: {
        Args: never
        Returns: {
          counterparty_id: string
          organization_id: string
        }[]
      }
      portal_get_context: {
        Args: never
        Returns: {
          counterparty_id: string
          counterparty_name: string
          organization_id: string
          role: string
        }[]
      }
      portal_get_document_storage_path: {
        Args: { p_document_id: string }
        Returns: string
      }
      portal_list_documents: {
        Args: { p_page?: number; p_page_size?: number }
        Returns: {
          document_type: string
          id: string
          original_filename: string
          total_count: number
          uploaded_at: string
        }[]
      }
      portal_list_movements: {
        Args: { p_page?: number; p_page_size?: number }
        Returns: {
          direction: string
          document_number: string
          document_type: string
          id: string
          movement_date: string
          pallet_type_code: string
          quantity: number
          site_name: string
          total_count: number
        }[]
      }
      portal_list_recovery_cases: {
        Args: { p_page?: number; p_page_size?: number }
        Returns: {
          due_date: string
          id: string
          opened_at: string
          outstanding_quantity: number
          outstanding_value: number
          pallet_type_code: string
          quantity_claimed: number
          quantity_recovered: number
          reference: string
          status: string
          total_count: number
        }[]
      }
      portal_list_vouchers: {
        Args: { p_page?: number; p_page_size?: number }
        Returns: {
          id: string
          issue_date: string
          outstanding_quantity: number
          pallet_type_code: string
          quantity: number
          recovered_quantity: number
          recovery_due_date: string
          site_name: string
          status: string
          total_count: number
          voucher_number: string
        }[]
      }
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
      update_document_state: {
        Args: {
          p_document_id: string
          p_new_status?: string
          p_new_visibility?: string
          p_notes?: string
        }
        Returns: {
          counterparty_id: string
          created_at: string
          document_type: string
          file_size: number
          id: string
          mime_type: string
          movement_id: string | null
          notes: string | null
          organization_id: string
          original_filename: string
          recovery_case_id: string | null
          recovery_event_id: string | null
          site_id: string | null
          status: string
          storage_path: string
          updated_at: string
          uploaded_at: string
          uploaded_by: string | null
          visibility: string
          voucher_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "documents"
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
