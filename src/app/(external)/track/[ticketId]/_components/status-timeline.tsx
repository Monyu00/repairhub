import { ArchiveIcon, CheckCircle2Icon, ClockIcon, PlusCircleIcon, WrenchIcon, XCircleIcon } from "lucide-react";

type TicketStatus = "pending" | "in_progress" | "completed" | "closed" | "cancelled";

interface TimelineEvent {
  id: string;
  content: string;
  type: "note" | "status_change";
  created_at: string;
}

interface StatusTimelineProps {
  createdAt: string;
  currentStatus: TicketStatus;
  events: TimelineEvent[];
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

function getStatusIcon(content: string) {
  const lower = content.toLowerCase();
  if (lower.includes("claim") || lower.includes("in_progress") || lower.includes("維修")) {
    return WrenchIcon;
  }
  if (lower.includes("complet") || lower.includes("完成")) {
    return CheckCircle2Icon;
  }
  if (lower.includes("clos") || lower.includes("結案")) {
    return ArchiveIcon;
  }
  if (lower.includes("cancel") || lower.includes("取消")) {
    return XCircleIcon;
  }
  return ClockIcon;
}

function translateStatusNote(content: string): string {
  // Translate the auto-generated English status notes from DB triggers
  if (content === "Ticket claimed by technician.") return "技師已領取工單，開始維修";
  return content;
}

export function StatusTimeline({ createdAt, events }: StatusTimelineProps) {
  const statusEvents = events.filter((e) => e.type === "status_change");

  // Build timeline: creation first, then status changes (newest first after creation)
  const allItems = [
    {
      id: "created",
      content: "報修單已建立",
      created_at: createdAt,
      isCreation: true,
    },
    ...statusEvents
      .slice()
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      .map((e) => ({
        id: e.id,
        content: translateStatusNote(e.content),
        created_at: e.created_at,
        isCreation: false,
      })),
  ].reverse(); // newest on top

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold text-foreground">狀態時間軸</h2>
      <div className="relative space-y-0">
        {allItems.map((item, index) => {
          const isLast = index === allItems.length - 1;
          const Icon = item.isCreation ? PlusCircleIcon : getStatusIcon(item.content);
          const isNewest = index === 0;

          return (
            <div key={item.id} className="flex gap-3">
              {/* Vertical line + icon */}
              <div className="flex flex-col items-center">
                <div
                  className={`flex size-7 shrink-0 items-center justify-center rounded-full border-2 z-10 ${
                    isNewest
                      ? "border-primary bg-primary text-primary-foreground"
                      : item.isCreation
                        ? "border-muted-foreground/40 bg-muted text-muted-foreground"
                        : "border-border bg-card text-muted-foreground"
                  }`}
                >
                  <Icon className="size-3.5" />
                </div>
                {!isLast && <div className="w-px flex-1 bg-border my-1" />}
              </div>

              {/* Content */}
              <div className={`pb-4 min-w-0 ${isLast ? "" : ""}`}>
                <p className={`text-sm font-medium ${isNewest ? "text-foreground" : "text-muted-foreground"}`}>
                  {item.content}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">{formatDateTime(item.created_at)}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
