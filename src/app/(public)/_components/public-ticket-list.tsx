"use client";

import Link from "next/link";

import { Calendar, ChevronRight, Inbox, MapPin, Plus, User } from "lucide-react";

import { TicketStatusBadge } from "@/components/tickets/ticket-status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatTicketDate, formatTicketLocation } from "@/lib/formatters";
import type { TicketRecord } from "@/server/tickets/query";

import { TicketPagination } from "./ticket-pagination";

interface PublicTicketListProps {
  tickets: TicketRecord[];
  currentPage: number;
  totalPages: number;
  totalCount: number;
  pageSize: number;
}

export function PublicTicketList({ tickets, currentPage, totalPages, totalCount, pageSize }: PublicTicketListProps) {
  if (tickets.length === 0) {
    return (
      <div className="border-border bg-card/40 flex min-h-[300px] flex-col items-center justify-center rounded-xl border border-dashed p-8 text-center">
        <div className="bg-muted text-muted-foreground mb-3 flex size-12 items-center justify-center rounded-full">
          <Inbox className="size-6" />
        </div>
        <h3 className="text-foreground text-base font-semibold">目前尚無符合條件的報修案件</h3>
        <p className="text-muted-foreground mt-1 max-w-sm text-xs">
          您可以嘗試清除或變更篩選條件，或直接提出新的報修申請。
        </p>
        <Button asChild size="sm" className="mt-4 gap-1.5">
          <Link href="/report">
            <Plus className="size-4" />
            我要報修
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Desktop Table View */}
      <div className="border-border bg-card hidden overflow-hidden rounded-xl border shadow-xs md:block">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 text-xs hover:bg-transparent">
              <TableHead className="w-[100px]">單號</TableHead>
              <TableHead className="w-[120px]">類別</TableHead>
              <TableHead className="w-[180px]">地點</TableHead>
              <TableHead>問題描述</TableHead>
              <TableHead className="w-[110px]">狀態</TableHead>
              <TableHead className="w-[130px]">負責技師</TableHead>
              <TableHead className="w-[140px] text-right">通報時間</TableHead>
              <TableHead className="w-[40px]">
                <span className="sr-only">操作</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tickets.map((ticket) => {
              const formattedDate = formatTicketDate(ticket.createdAt);

              return (
                <TableRow
                  key={ticket.id}
                  className="group focus-within:bg-muted/40 hover:bg-muted/40 relative cursor-pointer transition-colors"
                >
                  <TableCell className="text-muted-foreground group-hover:text-primary font-mono text-xs font-semibold">
                    <Link
                      href={`/track/${ticket.id}`}
                      prefetch={false}
                      aria-label={`查看報修單 ${ticket.id.slice(0, 8)}`}
                      className="focus-visible:ring-ring relative z-10 rounded-sm outline-none hover:underline hover:underline-offset-4 focus-visible:ring-2"
                    >
                      #{ticket.id.slice(0, 8)}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="px-2 py-0.5 text-xs font-normal">
                      {ticket.category.name}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-foreground truncate text-xs font-medium">
                    {formatTicketLocation(ticket)}
                  </TableCell>
                  <TableCell className="text-muted-foreground line-clamp-1 max-w-[320px] text-xs">
                    {ticket.description}
                  </TableCell>
                  <TableCell>
                    <TicketStatusBadge status={ticket.status} />
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    <div className="flex items-center gap-1.5 truncate">
                      <User className="text-muted-foreground/60 size-3 shrink-0" />
                      <span>{ticket.technicianName ?? "待指派"}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-right text-xs">{formattedDate}</TableCell>
                  <TableCell className="p-2 text-right">
                    <Link
                      href={`/track/${ticket.id}`}
                      prefetch={false}
                      className="absolute inset-0 z-0"
                      aria-hidden="true"
                      tabIndex={-1}
                    />
                    <ChevronRight
                      aria-hidden="true"
                      className="text-muted-foreground/60 group-hover:text-primary relative z-10 ml-auto transition-transform group-hover:translate-x-0.5"
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Cards View */}
      <div className="grid gap-3 md:hidden">
        {tickets.map((ticket) => {
          const formattedDate = formatTicketDate(ticket.createdAt);

          return (
            <Link key={ticket.id} href={`/track/${ticket.id}`} prefetch={false} className="group block">
              <Card className="border-border hover:border-primary/40 border shadow-2xs transition-colors transition-shadow hover:shadow-xs">
                <CardContent className="space-y-2.5 p-4">
                  {/* Top: ID, Category & Status */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground group-hover:text-primary font-mono text-xs font-semibold">
                        #{ticket.id.slice(0, 8)}
                      </span>
                      <Badge variant="secondary" className="px-1.5 py-0 text-xs font-normal">
                        {ticket.category.name}
                      </Badge>
                    </div>
                    <TicketStatusBadge status={ticket.status} />
                  </div>

                  {/* Middle: Description */}
                  <p className="text-foreground line-clamp-2 text-xs leading-relaxed">{ticket.description}</p>

                  {/* Bottom: Location & Date & Tech */}
                  <div className="border-border/50 text-muted-foreground flex flex-wrap items-center justify-between gap-y-1 border-t pt-1 text-xs">
                    <div className="flex max-w-[200px] items-center gap-1 truncate">
                      <MapPin className="text-muted-foreground/70 size-3 shrink-0" />
                      <span className="truncate">{formatTicketLocation(ticket)}</span>
                    </div>

                    <div className="flex shrink-0 items-center gap-1">
                      <Calendar className="text-muted-foreground/70 size-3" />
                      <span>{formattedDate}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      {/* Pagination */}
      <TicketPagination currentPage={currentPage} totalPages={totalPages} totalCount={totalCount} pageSize={pageSize} />
    </div>
  );
}
