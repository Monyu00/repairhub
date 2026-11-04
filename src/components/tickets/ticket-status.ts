import { ArchiveIcon, CheckCircle2Icon, ClockIcon, type LucideIcon, WrenchIcon, XCircleIcon } from "lucide-react";

import type { TicketStatus } from "@/server/tickets/lifecycle";

export interface TicketStatusPresentation {
  label: string;
  icon: LucideIcon;
  dotClass: string;
  badgeVariant: "default" | "secondary" | "destructive" | "outline" | "success" | "warning" | "info";
}

const PRESENTATION_BY_STATUS: Record<TicketStatus, TicketStatusPresentation> = {
  pending: {
    label: "待處理",
    icon: ClockIcon,
    dotClass: "bg-amber-500",
    badgeVariant: "warning",
  },
  in_progress: {
    label: "維修中",
    icon: WrenchIcon,
    dotClass: "bg-blue-500 animate-pulse motion-reduce:animate-none",
    badgeVariant: "info",
  },
  completed: {
    label: "已完工",
    icon: CheckCircle2Icon,
    dotClass: "bg-emerald-500",
    badgeVariant: "success",
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
