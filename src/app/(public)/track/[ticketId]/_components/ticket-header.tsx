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
          <p className="text-muted-foreground mb-1 text-xs font-medium tracking-wider uppercase">工單編號</p>
          <p className="text-foreground font-mono text-sm font-semibold break-all">{ticketId}</p>
        </div>
        <TicketStatusBadge
          status={status}
          className="h-auto self-start px-3 py-1 text-xs font-semibold sm:self-center"
        />
      </div>

      <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
        <CalendarIcon className="size-3.5 shrink-0" />
        <span>提交時間：{formatTicketDate(createdAt)}</span>
      </div>
    </div>
  );
}
