import { CalendarIcon } from "lucide-react";

import { TicketStatusBadge } from "@/components/tickets/ticket-status-badge";
import { formatTicketDate } from "@/lib/formatters";
import type { TicketStatus } from "@/server/tickets/lifecycle";

interface TicketHeaderProps {
  ticketId: string;
  status: TicketStatus;
  createdAt: string;
}

export function TicketHeader({ ticketId, status, createdAt }: TicketHeaderProps) {
  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="mb-1 font-medium text-muted-foreground text-xs uppercase tracking-wider">工單編號</p>
          <p className="break-all font-mono font-semibold text-foreground text-sm">{ticketId}</p>
        </div>
        <TicketStatusBadge
          status={status}
          className="h-auto self-start px-3 py-1 font-semibold text-xs sm:self-center"
        />
      </div>

      <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
        <CalendarIcon className="size-3.5 shrink-0" />
        <span>提交時間：{formatTicketDate(createdAt)}</span>
      </div>
    </div>
  );
}
