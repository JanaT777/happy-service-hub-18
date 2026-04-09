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
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string
          recipient_email: string | null
          recipient_type: string
          ticket_code: string
          ticket_id: string | null
          type: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          recipient_email?: string | null
          recipient_type?: string
          ticket_code: string
          ticket_id?: string | null
          type: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          recipient_email?: string | null
          recipient_type?: string
          ticket_code?: string
          ticket_id?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_reminder_log: {
        Row: {
          id: string
          message: string
          reminder_number: number
          sent_at: string
          ticket_code: string
          ticket_id: string
        }
        Insert: {
          id?: string
          message: string
          reminder_number: number
          sent_at?: string
          ticket_code: string
          ticket_id: string
        }
        Update: {
          id?: string
          message?: string
          reminder_number?: number
          sent_at?: string
          ticket_code?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_reminder_log_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      tickets: {
        Row: {
          activity_log: Json
          assigned_to: string | null
          attachments: Json | null
          complaint_items: Json | null
          complaint_status: string | null
          created_at: string
          created_by: string | null
          customer_email: string
          description: string | null
          iban: string | null
          id: string
          info_requests: Json | null
          internal_notes: Json
          issue_type: string | null
          last_reminder_at: string | null
          needs_info_message: string | null
          needs_info_since: string | null
          order_number: string | null
          other_status: string | null
          other_subtype: string | null
          product: string | null
          refund_method: string | null
          reminders_sent: number
          request_type: string
          requested_resolution: string | null
          return_items: Json | null
          return_status: string | null
          severity: string | null
          source: string
          status: string
          suggested_solution: string | null
          ticket_code: string
          updated_at: string
          warehouse_receipt: Json | null
          within_return_window: boolean | null
        }
        Insert: {
          activity_log?: Json
          assigned_to?: string | null
          attachments?: Json | null
          complaint_items?: Json | null
          complaint_status?: string | null
          created_at?: string
          created_by?: string | null
          customer_email: string
          description?: string | null
          iban?: string | null
          id?: string
          info_requests?: Json | null
          internal_notes?: Json
          issue_type?: string | null
          last_reminder_at?: string | null
          needs_info_message?: string | null
          needs_info_since?: string | null
          order_number?: string | null
          other_status?: string | null
          other_subtype?: string | null
          product?: string | null
          refund_method?: string | null
          reminders_sent?: number
          request_type?: string
          requested_resolution?: string | null
          return_items?: Json | null
          return_status?: string | null
          severity?: string | null
          source?: string
          status?: string
          suggested_solution?: string | null
          ticket_code: string
          updated_at?: string
          warehouse_receipt?: Json | null
          within_return_window?: boolean | null
        }
        Update: {
          activity_log?: Json
          assigned_to?: string | null
          attachments?: Json | null
          complaint_items?: Json | null
          complaint_status?: string | null
          created_at?: string
          created_by?: string | null
          customer_email?: string
          description?: string | null
          iban?: string | null
          id?: string
          info_requests?: Json | null
          internal_notes?: Json
          issue_type?: string | null
          last_reminder_at?: string | null
          needs_info_message?: string | null
          needs_info_since?: string | null
          order_number?: string | null
          other_status?: string | null
          other_subtype?: string | null
          product?: string | null
          refund_method?: string | null
          reminders_sent?: number
          request_type?: string
          requested_resolution?: string | null
          return_items?: Json | null
          return_status?: string | null
          severity?: string | null
          source?: string
          status?: string
          suggested_solution?: string | null
          ticket_code?: string
          updated_at?: string
          warehouse_receipt?: Json | null
          within_return_window?: boolean | null
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "crm" | "cc_admin"
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
      app_role: ["crm", "cc_admin"],
    },
  },
} as const
