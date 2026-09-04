import type { Database } from "@/lib/supabase/database.types";
import type {
  TicketBuilding,
  TicketCategory,
  TicketRecord,
  TicketSpace,
  TicketTechnician,
} from "@/server/tickets/query";

export type TicketStatus = Database["public"]["Enums"]["ticket_status"];

export type { TicketBuilding, TicketCategory, TicketRecord, TicketSpace, TicketTechnician };

// Re-export TicketRecord as TicketRow for gradual migration
export type TicketRow = TicketRecord;

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
