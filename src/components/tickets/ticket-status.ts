import { ArchiveIcon, CheckCircle2Icon, ClockIcon, type LucideIcon, WrenchIcon, XCircleIcon } from "lucide-react";

import type { TicketStatus } from "@/server/tickets/lifecycle";

export interface TicketStatusPresentation {
  label: string;
  icon: LucideIcon;
  dotClass: string;
  badgeVariant: "default" | "secondary" | "destructive" | "outline";
}

const PRESENTATION_BY_STATUS: Record<TicketStatus, TicketStatusPresentation> = {
  pending: {
    label: "待處理",
    icon: ClockIcon,
    dotClass: "bg-amber-500",
    badgeVariant: "outline",
  },
  in_progress: {
    label: "維修中",
    icon: WrenchIcon,
    dotClass: "bg-blue-500 animate-pulse motion-reduce:animate-none",
    badgeVariant: "outline",
  },
  completed: {
    label: "已完工",
    icon: CheckCircle2Icon,
    dotClass: "bg-emerald-500",
    badgeVariant: "outline",
  },
  closed: {
    label: "已結案",
    icon: ArchiveIcon,
    dotClass: "bg-zinc-400 dark:bg-zinc-500",
    badgeVariant: "secondary",
  },
  cancelled: {
    label: "已取消",
    icon: XCircleIcon,
    dotClass: "bg-destructive",
    badgeVariant: "destructive",
  },
};

export function getTicketStatusPresentation(status: TicketStatus): TicketStatusPresentation {
  return PRESENTATION_BY_STATUS[status];
}
