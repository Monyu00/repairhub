"use client";

import { format } from "date-fns";
import { zhTW } from "date-fns/locale/zh-TW";
import { Calendar, MapPin, User, Wrench } from "lucide-react";

import { TicketStatusBadge } from "@/app/(main)/dashboard/tickets/_components/ticket-status-badge";
import { Card, CardContent } from "@/components/ui/card";

import type { RepairRecordItem } from "./repair-records-types";

interface RepairRecordMobileCardProps {
  record: RepairRecordItem;
  isAdmin: boolean;
}

export function RepairRecordMobileCard({ record, isAdmin }: RepairRecordMobileCardProps) {
  const formattedDate = record.createdAt
    ? format(new Date(record.createdAt), "yyyy/MM/dd HH:mm", { locale: zhTW })
    : "-";

  return (
    <Card className="group cursor-pointer shadow-2xs transition-colors hover:border-primary/40">
      <CardContent className="space-y-3 p-4">
        <div className="flex items-center justify-between gap-2 border-border/50 border-b pb-2.5">
          <div className="flex items-center gap-2">
            <span className="font-mono font-semibold text-muted-foreground text-xs transition-colors group-hover:text-primary">
              #{record.id.slice(0, 8)}
            </span>
            <span className="rounded bg-muted px-1.5 py-0.5 font-medium text-xs">{record.category.name}</span>
          </div>
          <TicketStatusBadge status={record.status} />
        </div>

        <div className="space-y-1.5 text-xs">
          <div className="flex items-center gap-1.5 font-medium text-foreground">
            <MapPin className="size-3.5 shrink-0 text-muted-foreground" />
            <span>
              {record.space.building.name} - {record.space.name} ({record.space.floor}F)
            </span>
          </div>

          <p className="line-clamp-2 pl-5 text-muted-foreground leading-relaxed">{record.description}</p>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-border/40 border-t pt-2 text-[11px] text-muted-foreground">
          <div className="flex items-center gap-1">
            <Calendar className="size-3 shrink-0" />
            <span>{formattedDate}</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {isAdmin && record.technicianName && (
              <span className="flex items-center gap-1 font-medium text-foreground">
                <Wrench className="size-3 text-primary" />
                <span>{record.technicianName}</span>
              </span>
            )}
            {record.reporterName && (
              <span className="flex items-center gap-1">
                <User className="size-3" />
                <span className="max-w-[100px] truncate">{record.reporterName}</span>
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
