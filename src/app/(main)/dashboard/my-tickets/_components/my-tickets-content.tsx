"use client";

import Link from "next/link";

import { format } from "date-fns";
import { zhTW } from "date-fns/locale/zh-TW";
import { Calendar, ClipboardList, ExternalLink, MapPin, Plus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { TicketRecord } from "@/server/tickets/query";

import { STATUS_CONFIG } from "../../tickets/_components/ticket-status-badge";
import type { TicketStatus } from "../../tickets/_components/ticket-types";

interface MyTicketsContentProps {
  tickets: TicketRecord[];
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
          <h1 className="font-bold text-2xl text-foreground tracking-tight">我的報修紀錄</h1>
          <p className="text-muted-foreground text-sm">共 {tickets.length} 筆報修案件</p>
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

function TicketCard({ ticket }: { ticket: TicketRecord }) {
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
    <Link href={`/track/${ticket.id}`} className="group block">
      <Card className="shadow-2xs transition-all hover:border-primary/40 hover:shadow-sm">
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          {/* Left: info */}
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono font-semibold text-muted-foreground text-xs transition-colors group-hover:text-primary">
                #{ticket.id.slice(0, 8)}
              </span>
              <span className="rounded bg-muted px-1.5 py-0.5 font-medium text-xs">{ticket.category.name}</span>
              <Badge variant={config.variant} className={cn("gap-1.5 px-2.5 py-0.5 font-normal", config.bgClass)}>
                <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", config.dotClass)} />
                <span>{config.label}</span>
              </Badge>
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-muted-foreground text-xs">
              <span className="inline-flex items-center gap-1">
                <MapPin className="size-3.5 shrink-0" />
                {ticket.space.building.name} - {ticket.space.name} ({ticket.space.floor}F)
              </span>
              <span className="inline-flex items-center gap-1">
                <Calendar className="size-3.5 shrink-0" />
                {formattedDate}
              </span>
            </div>
          </div>

          {/* Right: action hint */}
          <div className="flex items-center self-end sm:self-center">
            <ExternalLink className="size-4 text-muted-foreground/50 transition-colors group-hover:text-primary" />
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
        <h1 className="font-bold text-2xl text-foreground tracking-tight">我的報修紀錄</h1>
        <p className="text-muted-foreground text-sm">查看您提交過的所有報修案件</p>
      </div>

      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center gap-4 py-16 text-center">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
            <ClipboardList className="size-7" />
          </div>
          <div className="space-y-1">
            <p className="font-medium text-foreground">目前尚無報修案件紀錄</p>
            <p className="text-muted-foreground text-sm">您提交的報修案件會顯示在這裡</p>
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
