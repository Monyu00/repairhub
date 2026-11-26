"use client";

import Link from "next/link";

import { Calendar, MapPin, User, Wrench } from "lucide-react";

import { TicketStatusBadge } from "@/components/tickets/ticket-status-badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatTicketDate, formatTicketLocation } from "@/lib/formatters";

import type { RepairRecordItem } from "./repair-records-types";

interface RepairRecordMobileCardProps {
  record: RepairRecordItem;
  isAdmin: boolean;
  href: string;
}

export function RepairRecordMobileCard({ record, isAdmin, href }: RepairRecordMobileCardProps) {
  const formattedDate = formatTicketDate(record.createdAt);

  return (
    <Card className="group hover:border-primary/40 focus-within:border-primary/40 relative cursor-pointer shadow-2xs transition-colors">
      <Link
        href={href}
        aria-label={`查看報修單 ${record.id.slice(0, 8)}`}
        className="focus-visible:ring-ring absolute inset-0 z-0 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-inset"
      />
      <CardContent className="space-y-3 p-4">
        <div className="border-border/50 flex items-center justify-between gap-2 border-b pb-2.5">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground group-hover:text-primary font-mono text-xs font-semibold transition-colors">
              #{record.id.slice(0, 8)}
            </span>
            <span className="bg-muted rounded px-1.5 py-0.5 text-xs font-medium">{record.category.name}</span>
          </div>
          <TicketStatusBadge status={record.status} />
        </div>

        <div className="space-y-1.5 text-xs">
          <div className="text-foreground flex items-center gap-1.5 font-medium">
            <MapPin className="text-muted-foreground size-3.5 shrink-0" />
            <span>{formatTicketLocation(record, { includeFloor: true })}</span>
          </div>

          <p className="text-muted-foreground line-clamp-2 pl-5 leading-relaxed">{record.description}</p>
        </div>

        <div className="border-border/40 text-muted-foreground flex flex-wrap items-center justify-between gap-2 border-t pt-2 text-xs">
          <div className="flex items-center gap-1">
            <Calendar className="size-3 shrink-0" />
            <span>{formattedDate}</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {isAdmin && record.technicianName && (
              <span className="text-foreground flex items-center gap-1 font-medium">
                <Wrench className="text-primary size-3" />
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
