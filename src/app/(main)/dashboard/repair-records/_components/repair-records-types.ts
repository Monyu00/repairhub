import type { TicketStatus } from "@/server/tickets/lifecycle";

export interface RepairRecordItem {
  id: string;
  status: TicketStatus;
  category: {
    id: string;
    name: string;
  };
  space: {
    id: string;
    name: string;
    floor: number;
    building: {
      id: string;
      name: string;
      code: string;
    };
  };
  description: string;
  reporterName: string | null;
  reporterDepartment: string | null;
  reporterEmail: string | null;
  reporterPhone: string | null;
  assignedTo: string | null;
  technicianName?: string | null;
  createdAt: string;
  updatedAt: string;
}

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
