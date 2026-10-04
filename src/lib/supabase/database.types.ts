export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      announcements: {
        Row: {
          audience: Database["public"]["Enums"]["announcement_audience"];
          author_id: string;
          body: string;
          category: Database["public"]["Enums"]["announcement_category"];
          created_at: string;
          expires_at: string | null;
          id: string;
          is_pinned: boolean;
          published_at: string;
          title: string;
          updated_at: string;
        };
        Insert: {
          audience: Database["public"]["Enums"]["announcement_audience"];
          author_id: string;
          body: string;
          category?: Database["public"]["Enums"]["announcement_category"];
          created_at?: string;
          expires_at?: string | null;
          id?: string;
          is_pinned?: boolean;
          published_at?: string;
          title: string;
          updated_at?: string;
        };
        Update: {
          audience?: Database["public"]["Enums"]["announcement_audience"];
          author_id?: string;
          body?: string;
          category?: Database["public"]["Enums"]["announcement_category"];
          created_at?: string;
          expires_at?: string | null;
          id?: string;
          is_pinned?: boolean;
          published_at?: string;
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "announcements_author_id_fkey";
            columns: ["author_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      buildings: {
        Row: {
          code: string;
          created_at: string;
          id: string;
          name: string;
          updated_at: string;
        };
        Insert: {
          code: string;
          created_at?: string;
          id?: string;
          name: string;
          updated_at?: string;
        };
        Update: {
          code?: string;
          created_at?: string;
          id?: string;
          name?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      categories: {
        Row: {
          created_at: string;
          id: string;
          is_active: boolean;
          name: string;
          sort_order: number;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          is_active?: boolean;
          name: string;
          sort_order?: number;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          is_active?: boolean;
          name?: string;
          sort_order?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      equipment: {
        Row: {
          code: string;
          created_at: string;
          id: string;
          name: string;
          purchase_date: string | null;
          space_id: string;
          updated_at: string;
          warranty_expiry: string | null;
        };
        Insert: {
          code: string;
          created_at?: string;
          id?: string;
          name: string;
          purchase_date?: string | null;
          space_id: string;
          updated_at?: string;
          warranty_expiry?: string | null;
        };
        Update: {
          code?: string;
          created_at?: string;
          id?: string;
          name?: string;
          purchase_date?: string | null;
          space_id?: string;
          updated_at?: string;
          warranty_expiry?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "equipment_space_id_fkey";
            columns: ["space_id"];
            isOneToOne: false;
            referencedRelation: "spaces";
            referencedColumns: ["id"];
          },
        ];
      };
      notification_log: {
        Row: {
          event_type: string;
          id: string;
          recipient_email: string;
          sent_at: string;
          ticket_id: string;
        };
        Insert: {
          event_type: string;
          id?: string;
          recipient_email: string;
          sent_at?: string;
          ticket_id: string;
        };
        Update: {
          event_type?: string;
          id?: string;
          recipient_email?: string;
          sent_at?: string;
          ticket_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "notification_log_ticket_id_fkey";
            columns: ["ticket_id"];
            isOneToOne: false;
            referencedRelation: "tickets";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          department: string | null;
          display_name: string | null;
          id: string;
          is_active: boolean;
          phone: string | null;
          updated_at: string;
          user_role: Database["public"]["Enums"]["user_role"] | null;
        };
        Insert: {
          department?: string | null;
          display_name?: string | null;
          id: string;
          is_active?: boolean;
          phone?: string | null;
          updated_at?: string;
          user_role?: Database["public"]["Enums"]["user_role"] | null;
        };
        Update: {
          department?: string | null;
          display_name?: string | null;
          id?: string;
          is_active?: boolean;
          phone?: string | null;
          updated_at?: string;
          user_role?: Database["public"]["Enums"]["user_role"] | null;
        };
        Relationships: [];
      };
      spaces: {
        Row: {
          building_id: string;
          created_at: string;
          floor: number;
          id: string;
          name: string;
          updated_at: string;
        };
        Insert: {
          building_id: string;
          created_at?: string;
          floor: number;
          id?: string;
          name: string;
          updated_at?: string;
        };
        Update: {
          building_id?: string;
          created_at?: string;
          floor?: number;
          id?: string;
          name?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "spaces_building_id_fkey";
            columns: ["building_id"];
            isOneToOne: false;
            referencedRelation: "buildings";
            referencedColumns: ["id"];
          },
        ];
      };
      technician_categories: {
        Row: {
          category_id: string;
          created_at: string;
          technician_id: string;
        };
        Insert: {
          category_id: string;
          created_at?: string;
          technician_id: string;
        };
        Update: {
          category_id?: string;
          created_at?: string;
          technician_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "technician_categories_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "technician_categories_technician_id_fkey";
            columns: ["technician_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      ticket_notes: {
        Row: {
          author_id: string | null;
          content: string;
          created_at: string;
          id: string;
          ticket_id: string;
          type: Database["public"]["Enums"]["ticket_note_type"];
        };
        Insert: {
          author_id?: string | null;
          content: string;
          created_at?: string;
          id?: string;
          ticket_id: string;
          type?: Database["public"]["Enums"]["ticket_note_type"];
        };
        Update: {
          author_id?: string | null;
          content?: string;
          created_at?: string;
          id?: string;
          ticket_id?: string;
          type?: Database["public"]["Enums"]["ticket_note_type"];
        };
        Relationships: [
          {
            foreignKeyName: "ticket_notes_author_id_fkey";
            columns: ["author_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ticket_notes_ticket_id_fkey";
            columns: ["ticket_id"];
            isOneToOne: false;
            referencedRelation: "tickets";
            referencedColumns: ["id"];
          },
        ];
      };
      ticket_photos: {
        Row: {
          created_at: string;
          id: string;
          phase: Database["public"]["Enums"]["ticket_photo_phase"];
          storage_path: string;
          ticket_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          phase: Database["public"]["Enums"]["ticket_photo_phase"];
          storage_path: string;
          ticket_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          phase?: Database["public"]["Enums"]["ticket_photo_phase"];
          storage_path?: string;
          ticket_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "ticket_photos_ticket_id_fkey";
            columns: ["ticket_id"];
            isOneToOne: false;
            referencedRelation: "tickets";
            referencedColumns: ["id"];
          },
        ];
      };
      tickets: {
        Row: {
          assigned_to: string | null;
          category_id: string;
          created_at: string;
          description: string;
          equipment_id: string | null;
          equipment_name: string | null;
          id: string;
          reporter_department: string | null;
          reporter_email: string;
          reporter_name: string | null;
          reporter_phone: string | null;
          space_id: string;
          status: Database["public"]["Enums"]["ticket_status"];
          ticket_number: string | null;
          updated_at: string;
        };
        Insert: {
          assigned_to?: string | null;
          category_id: string;
          created_at?: string;
          description: string;
          equipment_id?: string | null;
          equipment_name?: string | null;
          id?: string;
          reporter_department?: string | null;
          reporter_email: string;
          reporter_name?: string | null;
          reporter_phone?: string | null;
          space_id: string;
          status?: Database["public"]["Enums"]["ticket_status"];
          ticket_number?: string | null;
          updated_at?: string;
        };
        Update: {
          assigned_to?: string | null;
          category_id?: string;
          created_at?: string;
          description?: string;
          equipment_id?: string | null;
          equipment_name?: string | null;
          id?: string;
          reporter_department?: string | null;
          reporter_email?: string;
          reporter_name?: string | null;
          reporter_phone?: string | null;
          space_id?: string;
          status?: Database["public"]["Enums"]["ticket_status"];
          ticket_number?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "tickets_assigned_to_fkey";
            columns: ["assigned_to"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tickets_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tickets_equipment_id_fkey";
            columns: ["equipment_id"];
            isOneToOne: false;
            referencedRelation: "equipment";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tickets_space_id_fkey";
            columns: ["space_id"];
            isOneToOne: false;
            referencedRelation: "spaces";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      auto_close_completed_tickets: { Args: never; Returns: undefined };
      claim_ticket: {
        Args: { p_technician_id: string; p_ticket_id: string };
        Returns: boolean;
      };
    };
    Enums: {
      announcement_audience: "internal" | "public" | "all";
      announcement_category: "general" | "system_maintenance" | "outage" | "policy";
      ticket_note_type: "note" | "status_change";
      ticket_photo_phase: "report" | "closure";
      ticket_status: "pending" | "in_progress" | "completed" | "closed" | "cancelled";
      user_role: "admin" | "technician";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      announcement_audience: ["internal", "public", "all"],
      announcement_category: ["general", "system_maintenance", "outage", "policy"],
      ticket_note_type: ["note", "status_change"],
      ticket_photo_phase: ["report", "closure"],
      ticket_status: ["pending", "in_progress", "completed", "closed", "cancelled"],
      user_role: ["admin", "technician"],
    },
  },
} as const;
