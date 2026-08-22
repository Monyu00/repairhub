import type { Database } from "@/lib/supabase/database.types";

export type TicketStatus = Database["public"]["Enums"]["ticket_status"];

export interface TicketCategory {
  id: string;
  name: string;
}

export interface TicketBuilding {
  id: string;
  name: string;
  code: string;
}

export interface TicketSpace {
  id: string;
  name: string;
  floor: number;
  building: TicketBuilding;
}

export interface TicketRow {
  id: string;
  status: TicketStatus;
  category_id?: string;
  category: TicketCategory;
  space: TicketSpace;
  description: string;
  reporter_name?: string | null;
  reporter_department?: string | null;
  reporter_email?: string | null;
  reporter_phone?: string | null;
  created_at: string;
  updated_at: string;
}

export interface FilterOptions {
  categories: TicketCategory[];
  buildings: TicketBuilding[];
}

export interface TicketFilters {
  status: TicketStatus[];
  categoryId: string;
  buildingId: string;
  fromDate?: string;
  toDate?: string;
}
