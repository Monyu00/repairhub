import Link from "next/link";

import { ArrowRight, Inbox } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { TicketRecord } from "@/server/tickets/query";

import { TicketStatusBadge } from "../tickets/_components/ticket-status-badge";

interface DashboardOpenQueueProps {
  tickets: TicketRecord[];
}

function formatOpenedAt(value: string): string {
  return new Intl.DateTimeFormat("zh-TW", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Taipei",
  }).format(new Date(value));
}

export function DashboardOpenQueue({ tickets }: DashboardOpenQueueProps) {
  return (
    <Card className="h-full">
      <CardHeader className="flex flex-col gap-2 space-y-0 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className="text-base">待辦維修單</CardTitle>
          <CardDescription className="text-xs">最近待處理或維修中的案件</CardDescription>
        </div>
        <Button asChild variant="ghost" size="sm" className="h-7 text-xs">
          <Link href="/dashboard/tickets">
            查看全部
            <ArrowRight data-icon="inline-end" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        {tickets.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed bg-muted/30 px-4 py-8 text-center">
            <Inbox className="size-5 text-muted-foreground" aria-hidden="true" />
            <p className="text-muted-foreground text-sm">目前沒有開放中的維修單</p>
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {tickets.map((ticket) => (
              <li key={ticket.id}>
                <Link
                  href={`/dashboard/tickets/${ticket.id}`}
                  className="group flex items-start justify-between gap-3 rounded-lg border border-border/60 bg-muted/20 p-3 transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <TicketStatusBadge status={ticket.status} />
                      <span className="truncate font-medium text-foreground text-sm group-hover:text-primary">
                        {ticket.category.name}
                      </span>
                    </div>
                    <p className="mt-1 line-clamp-1 text-muted-foreground text-xs">
                      {ticket.space.building.name} / {ticket.space.name} · {ticket.description}
                    </p>
                  </div>
                  <time dateTime={ticket.createdAt} className="shrink-0 text-muted-foreground text-xs">
                    {formatOpenedAt(ticket.createdAt)}
                  </time>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
