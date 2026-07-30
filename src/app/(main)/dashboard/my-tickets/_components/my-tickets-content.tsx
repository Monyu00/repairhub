"use client";

import Link from "next/link";

import { format } from "date-fns";
import { zhTW } from "date-fns/locale/zh-TW";
import { Calendar, ClipboardList, ExternalLink, MapPin, Plus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

import { STATUS_CONFIG } from "../../tickets/_components/ticket-status-badge";
import type { TicketStatus } from "../../tickets/_components/ticket-types";

export interface MyTicket {
  id: string;
  status: string;
  category: string;
  building: string;
  space: string;
  floor: number;
  createdAt: string;
}

interface MyTicketsContentProps {
  tickets: MyTicket[];
}

export function MyTicketsContent({ tickets }: MyTicketsContentProps) {
  if (tickets.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">我的報修紀錄</h1>
          <p className="text-sm text-muted-foreground">共 {tickets.length} 筆報修案件</p>
        </div>
        <Button asChild size="sm" className="mt-2 sm:mt-0">
          <Link href="/report">
            <Plus className="mr-1.5 size-4" />
            我要報修
          </Link>
        </Button>
      </div>

      {/* Ticket List */}
      <div className="grid gap-3">
        {tickets.map((ticket) => (
          <TicketCard key={ticket.id} ticket={ticket} />
        ))}
      </div>
    </div>
  );
}

function TicketCard({ ticket }: { ticket: MyTicket }) {
  const config = STATUS_CONFIG[ticket.status as TicketStatus] ?? {
    label: ticket.status,
    variant: "outline" as const,
    dotClass: "bg-muted-foreground",
    bgClass: "",
  };

  const formattedDate = ticket.createdAt
    ? format(new Date(ticket.createdAt), "yyyy/MM/dd HH:mm", { locale: zhTW })
    : "-";

  return (
    <Link href={`/track/${ticket.id}`} className="block group">
      <Card className="shadow-2xs transition-all hover:border-primary/40 hover:shadow-sm">
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          {/* Left: info */}
          <div className="flex flex-1 flex-col gap-2 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs font-semibold text-muted-foreground group-hover:text-primary transition-colors">
                #{ticket.id.slice(0, 8)}
              </span>
              <span className="rounded bg-muted px-1.5 py-0.5 text-xs font-medium">{ticket.category}</span>
              <Badge variant={config.variant} className={cn("gap-1.5 font-normal px-2.5 py-0.5", config.bgClass)}>
                <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", config.dotClass)} />
                <span>{config.label}</span>
              </Badge>
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <MapPin className="size-3.5 shrink-0" />
                {ticket.building} - {ticket.space} ({ticket.floor}F)
              </span>
              <span className="inline-flex items-center gap-1">
                <Calendar className="size-3.5 shrink-0" />
                {formattedDate}
              </span>
            </div>
          </div>

          {/* Right: action hint */}
          <div className="flex items-center self-end sm:self-center">
            <ExternalLink className="size-4 text-muted-foreground/50 group-hover:text-primary transition-colors" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function EmptyState() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">我的報修紀錄</h1>
        <p className="text-sm text-muted-foreground">查看您提交過的所有報修案件</p>
      </div>

      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center gap-4 py-16 text-center">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
            <ClipboardList className="size-7" />
          </div>
          <div className="space-y-1">
            <p className="font-medium text-foreground">目前尚無報修案件紀錄</p>
            <p className="text-sm text-muted-foreground">您提交的報修案件會顯示在這裡</p>
          </div>
          <Button asChild className="mt-2">
            <Link href="/report">
              <Plus className="mr-1.5 size-4" />
              我要報修
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
