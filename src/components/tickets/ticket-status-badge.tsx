import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { TicketStatus } from "@/server/tickets/lifecycle";

import { getTicketStatusPresentation } from "./ticket-status";

interface TicketStatusBadgeProps {
  status: TicketStatus;
  className?: string;
}

const BADGE_CLASS_BY_STATUS: Record<TicketStatus, string> = {
  pending: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
  in_progress: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20",
  completed: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
  closed: "bg-muted text-muted-foreground border-border",
  cancelled: "",
};

export function TicketStatusBadge({ status, className }: TicketStatusBadgeProps) {
  const presentation = getTicketStatusPresentation(status);

  return (
    <Badge
      variant={presentation.badgeVariant}
      className={cn("gap-1.5 px-2.5 py-0.5 font-normal", BADGE_CLASS_BY_STATUS[status], className)}
    >
      <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", presentation.dotClass)} />
      <span>{presentation.label}</span>
    </Badge>
  );
}
