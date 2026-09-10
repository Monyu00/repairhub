"use client";

import Link from "next/link";

import { Calendar, ChevronRight, Inbox, MapPin, Plus, User } from "lucide-react";

import { TicketStatusBadge } from "@/app/(main)/dashboard/tickets/_components/ticket-status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatTicketDate } from "@/lib/formatters";
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
      <div className="flex min-h-[300px] flex-col items-center justify-center rounded-xl border border-border border-dashed bg-card/40 p-8 text-center">
        <div className="mb-3 flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <Inbox className="size-6" />
        </div>
        <h3 className="font-semibold text-base text-foreground">目前尚無符合條件的報修案件</h3>
        <p className="mt-1 max-w-sm text-muted-foreground text-xs">
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
      <div className="hidden overflow-hidden rounded-xl border border-border bg-card shadow-xs md:block">
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
              <TableHead className="w-[40px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {tickets.map((ticket) => {
              const formattedDate = formatTicketDate(ticket.createdAt);

              return (
                <TableRow key={ticket.id} className="group cursor-pointer transition-colors hover:bg-muted/40">
                  <TableCell className="font-mono font-semibold text-muted-foreground text-xs group-hover:text-primary">
                    <Link href={`/track/${ticket.id}`} className="block">
                      #{ticket.id.slice(0, 8)}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Link href={`/track/${ticket.id}`} className="block">
                      <Badge variant="secondary" className="px-2 py-0.5 font-normal text-xs">
                        {ticket.category.name}
                      </Badge>
                    </Link>
                  </TableCell>
                  <TableCell className="font-medium text-foreground text-xs">
                    <Link href={`/track/${ticket.id}`} className="block truncate">
                      {ticket.space.building.name} - {ticket.space.name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    <Link href={`/track/${ticket.id}`} className="line-clamp-1 block max-w-[320px]">
                      {ticket.description}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Link href={`/track/${ticket.id}`} className="block">
                      <TicketStatusBadge status={ticket.status} />
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    <Link href={`/track/${ticket.id}`} className="flex items-center gap-1.5 truncate">
                      <User className="size-3 shrink-0 text-muted-foreground/60" />
                      <span>{ticket.technicianName || "待指派"}</span>
                    </Link>
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground text-xs">
                    <Link href={`/track/${ticket.id}`} className="block">
                      {formattedDate}
                    </Link>
                  </TableCell>
                  <TableCell className="p-2 text-right">
                    <Link href={`/track/${ticket.id}`} className="inline-flex">
                      <ChevronRight className="size-4 text-muted-foreground/40 transition-all group-hover:translate-x-0.5 group-hover:text-primary" />
                    </Link>
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
            <Link key={ticket.id} href={`/track/${ticket.id}`} className="group block">
              <Card className="border border-border shadow-2xs transition-all hover:border-primary/40 hover:shadow-xs">
                <CardContent className="space-y-2.5 p-4">
                  {/* Top: ID, Category & Status */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-semibold text-muted-foreground text-xs group-hover:text-primary">
                        #{ticket.id.slice(0, 8)}
                      </span>
                      <Badge variant="secondary" className="px-1.5 py-0 font-normal text-[11px]">
                        {ticket.category.name}
                      </Badge>
                    </div>
                    <TicketStatusBadge status={ticket.status} />
                  </div>

                  {/* Middle: Description */}
                  <p className="line-clamp-2 text-foreground text-xs leading-relaxed">{ticket.description}</p>

                  {/* Bottom: Location & Date & Tech */}
                  <div className="flex flex-wrap items-center justify-between gap-y-1 border-border/50 border-t pt-1 text-[11px] text-muted-foreground">
                    <div className="flex max-w-[200px] items-center gap-1 truncate">
                      <MapPin className="size-3 shrink-0 text-muted-foreground/70" />
                      <span className="truncate">
                        {ticket.space.building.name} - {ticket.space.name}
                      </span>
                    </div>

                    <div className="flex shrink-0 items-center gap-1">
                      <Calendar className="size-3 text-muted-foreground/70" />
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
