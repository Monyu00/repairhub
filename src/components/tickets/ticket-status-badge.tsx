import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { TicketStatus } from "@/server/tickets/lifecycle";

import { getTicketStatusPresentation } from "./ticket-status";

interface TicketStatusBadgeProps {
  status: TicketStatus;
  className?: string;
}

export function TicketStatusBadge({ status, className }: TicketStatusBadgeProps) {
  const presentation = getTicketStatusPresentation(status);

  return (
    <Badge variant={presentation.badgeVariant} className={className}>
      <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", presentation.dotClass)} />
      <span>{presentation.label}</span>
    </Badge>
  );
}
