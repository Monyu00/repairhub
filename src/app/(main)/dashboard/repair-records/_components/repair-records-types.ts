import type { TicketRecord } from "@/server/tickets/query";

// Re-export canonical TicketRecord as RepairRecordItem
export type RepairRecordItem = TicketRecord;

export interface TechnicianOption {
  id: string;
  displayName: string;
}

export function formatRepairRecordDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "-";
  return new Intl.DateTimeFormat("zh-TW", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
}
