import { ArchiveIcon, CalendarIcon, CheckCircle2Icon, ClockIcon, WrenchIcon, XCircleIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";

type TicketStatus = "pending" | "in_progress" | "completed" | "closed" | "cancelled";

const STATUS_CONFIG: Record<
  TicketStatus,
  {
    label: string;
    className: string;
    Icon: React.ComponentType<{ className?: string }>;
  }
> = {
  pending: {
    label: "待處理",
    className: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
    Icon: ClockIcon,
  },
  in_progress: {
    label: "維修中",
    className: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20",
    Icon: WrenchIcon,
  },
  completed: {
    label: "已完成",
    className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
    Icon: CheckCircle2Icon,
  },
  closed: {
    label: "已結案",
    className: "bg-muted text-muted-foreground border-border",
    Icon: ArchiveIcon,
  },
  cancelled: {
    label: "已取消",
    className: "bg-destructive/10 text-destructive border-destructive/20",
    Icon: XCircleIcon,
  },
};

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
  const config = STATUS_CONFIG[status];
  const { Icon } = config;

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="mb-1 font-medium text-muted-foreground text-xs uppercase tracking-wider">工單編號</p>
          <p className="break-all font-mono font-semibold text-foreground text-sm">{ticketId}</p>
        </div>
        <Badge
          className={`inline-flex h-auto items-center gap-1.5 self-start rounded-full border px-3 py-1 font-semibold text-xs sm:self-center ${config.className}`}
        >
          <Icon className="size-3.5" />
          {config.label}
        </Badge>
      </div>

      <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
        <CalendarIcon className="size-3.5 shrink-0" />
        <span>提交時間：{formatDateTime(createdAt)}</span>
      </div>
    </div>
  );
}

export type { TicketStatus };
export { STATUS_CONFIG };
