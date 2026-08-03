export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      buildings: {
        Row: {
          id: string;
          name: string;
          code: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          code: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          code?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      spaces: {
        Row: {
          id: string;
          name: string;
          floor: number;
          building_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          floor: number;
          building_id: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          floor?: number;
          building_id?: string;
          created_at?: string;
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
      categories: {
        Row: {
          id: string;
          name: string;
          sort_order: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          sort_order?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          sort_order?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          user_role: Database["public"]["Enums"]["user_role"] | null;
          display_name: string | null;
          updated_at: string;
        };
        Insert: {
          id: string;
          user_role?: Database["public"]["Enums"]["user_role"] | null;
          display_name?: string | null;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_role?: Database["public"]["Enums"]["user_role"] | null;
          display_name?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey";
            columns: ["id"];
            isOneToOne: true;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      technician_categories: {
        Row: {
          technician_id: string;
          category_id: string;
          created_at: string;
        };
        Insert: {
          technician_id: string;
          category_id: string;
          created_at?: string;
        };
        Update: {
          technician_id?: string;
          category_id?: string;
          created_at?: string;
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
      equipment: {
        Row: {
          id: string;
          name: string;
          code: string;
          space_id: string;
          purchase_date: string | null;
          warranty_expiry: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          code: string;
          space_id: string;
          purchase_date?: string | null;
          warranty_expiry?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          code?: string;
          space_id?: string;
          purchase_date?: string | null;
          warranty_expiry?: string | null;
          created_at?: string;
          updated_at?: string;
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
      tickets: {
        Row: {
          id: string;
          status: Database["public"]["Enums"]["ticket_status"];
          category_id: string;
          space_id: string;
          equipment_id: string | null;
          description: string;
          reporter_email: string;
          reporter_phone: string | null;
          assigned_to: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          status?: Database["public"]["Enums"]["ticket_status"];
          category_id: string;
          space_id: string;
          equipment_id?: string | null;
          description: string;
          reporter_email: string;
          reporter_phone?: string | null;
          assigned_to?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          status?: Database["public"]["Enums"]["ticket_status"];
          category_id?: string;
          space_id?: string;
          equipment_id?: string | null;
          description?: string;
          reporter_email?: string;
          reporter_phone?: string | null;
          assigned_to?: string | null;
          created_at?: string;
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
            foreignKeyName: "tickets_space_id_fkey";
            columns: ["space_id"];
            isOneToOne: false;
            referencedRelation: "spaces";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tickets_equipment_id_fkey";
            columns: ["equipment_id"];
            isOneToOne: false;
            referencedRelation: "equipment";
            referencedColumns: ["id"];
          },
        ];
      };
      ticket_photos: {
        Row: {
          id: string;
          ticket_id: string;
          storage_path: string;
          phase: Database["public"]["Enums"]["ticket_photo_phase"];
          created_at: string;
        };
        Insert: {
          id?: string;
          ticket_id: string;
          storage_path: string;
          phase: Database["public"]["Enums"]["ticket_photo_phase"];
          created_at?: string;
        };
        Update: {
          id?: string;
          ticket_id?: string;
          storage_path?: string;
          phase?: Database["public"]["Enums"]["ticket_photo_phase"];
          created_at?: string;
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
      ticket_notes: {
        Row: {
          id: string;
          ticket_id: string;
          author_id: string | null;
          content: string;
          type: Database["public"]["Enums"]["ticket_note_type"];
          created_at: string;
        };
        Insert: {
          id?: string;
          ticket_id: string;
          author_id?: string | null;
          content: string;
          type?: Database["public"]["Enums"]["ticket_note_type"];
          created_at?: string;
        };
        Update: {
          id?: string;
          ticket_id?: string;
          author_id?: string | null;
          content?: string;
          type?: Database["public"]["Enums"]["ticket_note_type"];
          created_at?: string;
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
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      claim_ticket: {
        Args: {
          p_ticket_id: string;
          p_technician_id: string;
        };
        Returns: boolean;
      };
    };
    Enums: {
      user_role: "admin" | "technician";
      ticket_status: "pending" | "in_progress" | "completed" | "closed" | "cancelled";
      ticket_photo_phase: "report" | "closure";
      ticket_note_type: "note" | "status_change";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}
