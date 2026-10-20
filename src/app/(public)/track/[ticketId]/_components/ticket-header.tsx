import { CalendarIcon } from "lucide-react";

import { TicketStatusBadge } from "@/components/tickets/ticket-status-badge";
import type { TicketStatus } from "@/server/tickets/lifecycle";

interface TicketHeaderProps {
  ticketId: string;
  status: TicketStatus;
  createdAt: string;
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("zh-TW", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
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
        <span>提交時間：{formatDateTime(createdAt)}</span>
      </div>
    </div>
  );
}
