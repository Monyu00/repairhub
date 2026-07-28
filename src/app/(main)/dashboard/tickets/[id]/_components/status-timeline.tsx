"use client";

import {
  ArchiveIcon,
  CheckCircle2Icon,
  ClockIcon,
  History,
  PlusCircleIcon,
  WrenchIcon,
  XCircleIcon,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export interface TimelineNote {
  id: string;
  content: string;
  type: "note" | "status_change";
  createdAt: string;
  authorRole?: string | null;
}

interface StatusTimelineProps {
  createdAt: string;
  notes: TimelineNote[];
}

function formatDateTime(iso: string) {
  try {
    return new Date(iso).toLocaleString("zh-TW", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function getStatusIcon(content: string) {
  const lower = content.toLowerCase();
  if (lower.includes("claim") || lower.includes("in_progress") || lower.includes("維修")) {
    return WrenchIcon;
  }
  if (lower.includes("complet") || lower.includes("完成") || lower.includes("結案")) {
    return CheckCircle2Icon;
  }
  if (lower.includes("clos")) {
    return ArchiveIcon;
  }
  if (lower.includes("cancel") || lower.includes("取消")) {
    return XCircleIcon;
  }
  return ClockIcon;
}

function translateStatusNote(content: string): string {
  if (content === "Ticket claimed by technician.") return "技師已接單領用，狀態轉為維修中";
  return content;
}

function getRoleLabel(role?: string | null) {
  if (role === "admin") return "管理者";
  if (role === "technician") return "維修技師";
  return null;
}

function getNodeStyle(isNewest: boolean, isCreation: boolean) {
  if (isNewest) {
    return "border-primary bg-primary text-primary-foreground";
  }
  if (isCreation) {
    return "border-muted-foreground/40 bg-muted text-muted-foreground";
  }
  return "border-border bg-card text-muted-foreground";
}

export function StatusTimeline({ createdAt, notes }: StatusTimelineProps) {
  const statusEvents = notes.filter((n) => n.type === "status_change");

  // Build full chronological history (newest on top)
  const items = [
    {
      id: "created",
      content: "報修單由通報人提交建立",
      createdAt: createdAt,
      isCreation: true,
      authorRole: "通報人",
    },
    ...statusEvents.map((e) => ({
      id: e.id,
      content: translateStatusNote(e.content),
      createdAt: e.createdAt,
      isCreation: false,
      authorRole: getRoleLabel(e.authorRole),
    })),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <Card className="shadow-2xs">
      <CardHeader className="border-border/50 border-b pb-3">
        <CardTitle className="flex items-center gap-2 font-semibold text-base">
          <History className="size-4 text-primary" />
          狀態變更時間軸
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        {items.length === 0 ? (
          <p className="text-muted-foreground text-xs italic">無紀錄</p>
        ) : (
          <div className="relative space-y-0 pl-1">
            {items.map((item, index) => {
              const isLast = index === items.length - 1;
              const Icon = item.isCreation ? PlusCircleIcon : getStatusIcon(item.content);
              const isNewest = index === 0;

              return (
                <div key={item.id} className="flex gap-3">
                  {/* Vertical timeline node */}
                  <div className="flex flex-col items-center">
                    <div
                      className={`z-10 flex size-6 shrink-0 items-center justify-center rounded-full border-2 ${getNodeStyle(isNewest, item.isCreation)}`}
                    >
                      <Icon className="size-3" />
                    </div>
                    {!isLast && <div className="my-1 w-px flex-1 bg-border/70" />}
                  </div>

                  {/* Content */}
                  <div className="min-w-0 flex-1 pb-4">
                    <div className="flex items-center gap-2">
                      <p className={`font-semibold text-xs ${isNewest ? "text-foreground" : "text-muted-foreground"}`}>
                        {item.content}
                      </p>
                      {item.authorRole && (
                        <span className="rounded bg-muted px-1.5 py-0.2 font-medium text-[10px] text-muted-foreground">
                          {item.authorRole}
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">{formatDateTime(item.createdAt)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
