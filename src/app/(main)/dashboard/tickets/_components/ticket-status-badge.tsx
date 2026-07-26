import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

import type { TicketStatus } from "./ticket-types";

interface TicketStatusBadgeProps {
  status: TicketStatus;
  className?: string;
}

export const STATUS_CONFIG: Record<
  TicketStatus,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline"; dotClass: string; bgClass: string }
> = {
  pending: {
    label: "待處理",
    variant: "outline",
    dotClass: "bg-amber-500",
    bgClass: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
  },
  in_progress: {
    label: "維修中",
    variant: "outline",
    dotClass: "bg-blue-500 animate-pulse",
    bgClass: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20",
  },
  completed: {
    label: "已完工",
    variant: "outline",
    dotClass: "bg-emerald-500",
    bgClass: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
  },
  closed: {
    label: "已結案",
    variant: "secondary",
    dotClass: "bg-zinc-400 dark:bg-zinc-500",
    bgClass: "bg-muted text-muted-foreground border-border",
  },
  cancelled: {
    label: "已取消",
    variant: "destructive",
    dotClass: "bg-destructive",
    bgClass: "",
  },
};

export function TicketStatusBadge({ status, className }: TicketStatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? {
    label: status,
    variant: "outline",
    dotClass: "bg-muted-foreground",
    bgClass: "",
  };

  return (
    <Badge variant={config.variant} className={cn("gap-1.5 font-normal px-2.5 py-0.5", config.bgClass, className)}>
      <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", config.dotClass)} />
      <span>{config.label}</span>
    </Badge>
  );
}
