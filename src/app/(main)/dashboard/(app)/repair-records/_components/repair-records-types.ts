import type { TicketRecord } from "@/server/tickets/query";

// Re-export canonical TicketRecord as RepairRecordItem
export type RepairRecordItem = TicketRecord;

export interface TechnicianOption {
  id: string;
  displayName: string;
}
