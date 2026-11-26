import Link from "next/link";

import { ArrowRight, Inbox } from "lucide-react";

import { TicketStatusBadge } from "@/components/tickets/ticket-status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia } from "@/components/ui/empty";
import { formatShortDateTime, formatTicketLocation } from "@/lib/formatters";
import type { TicketRecord } from "@/server/tickets/query";

interface DashboardOpenQueueProps {
  tickets: TicketRecord[];
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
          <Empty className="bg-muted/30 border border-dashed py-8">
            <EmptyMedia variant="icon">
              <Inbox />
            </EmptyMedia>
            <EmptyHeader>
              <EmptyDescription>目前沒有開放中的維修單</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <ul className="flex flex-col gap-2">
            {tickets.map((ticket) => (
              <li key={ticket.id}>
                <Link
                  href={`/dashboard/tickets/${ticket.id}`}
                  prefetch={false}
                  className="group border-border/60 bg-muted/20 hover:bg-muted/40 focus-visible:ring-ring/50 flex items-start justify-between gap-3 rounded-lg border p-3 transition-colors focus-visible:ring-3 focus-visible:outline-none"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <TicketStatusBadge status={ticket.status} />
                      <span className="text-foreground group-hover:text-primary truncate text-sm font-medium">
                        {ticket.category.name}
                      </span>
                    </div>
                    <p className="text-muted-foreground mt-1 line-clamp-1 text-xs">
                      {formatTicketLocation(ticket)} · {ticket.description}
                    </p>
                  </div>
                  <time dateTime={ticket.createdAt} className="text-muted-foreground shrink-0 font-mono text-xs">
                    {formatShortDateTime(ticket.createdAt)}
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
