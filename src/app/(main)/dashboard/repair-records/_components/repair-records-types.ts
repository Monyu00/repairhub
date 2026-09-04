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
