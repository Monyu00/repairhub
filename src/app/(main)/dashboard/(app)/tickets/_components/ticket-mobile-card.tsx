import Link from "next/link";

import { Calendar, Mail, MapPin, Phone, User } from "lucide-react";

import { TicketStatusBadge } from "@/components/tickets/ticket-status-badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatTicketDate, formatTicketLocation } from "@/lib/formatters";
import type { TicketRecord } from "@/server/tickets/query";

interface TicketMobileCardProps {
  ticket: TicketRecord;
  canViewReporter: boolean;
  href: string;
}

export function TicketMobileCard({ ticket, canViewReporter, href }: TicketMobileCardProps) {
  const formattedDate = ticket.createdAt ? formatTicketDate(ticket.createdAt) : "-";

  return (
    <Card className="group hover:border-primary/40 focus-within:border-primary/40 relative cursor-pointer shadow-2xs transition-colors">
      <Link
        href={href}
        aria-label={`查看報修單 ${ticket.id.slice(0, 8)}`}
        className="focus-visible:ring-ring absolute inset-0 z-0 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-inset"
      />
      <CardContent className="space-y-3 p-4">
        <div className="border-border/50 flex items-center justify-between gap-2 border-b pb-2.5">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground group-hover:text-primary font-mono text-xs font-semibold transition-colors">
              #{ticket.id.slice(0, 8)}
            </span>
            <span className="bg-muted rounded px-1.5 py-0.5 text-xs font-medium">{ticket.category.name}</span>
          </div>
          <TicketStatusBadge status={ticket.status} />
        </div>

        <div className="space-y-1.5 text-xs">
          <div className="text-foreground flex items-center gap-1.5 font-medium">
            <MapPin className="text-muted-foreground size-3.5 shrink-0" />
            <span className="max-w-[200px] truncate">{formatTicketLocation(ticket, { includeFloor: true })}</span>
          </div>

          <p className="text-muted-foreground line-clamp-2 pl-5 leading-relaxed">{ticket.description}</p>
        </div>

        <div className="border-border/40 text-muted-foreground flex flex-wrap items-center justify-between gap-2 border-t pt-2 text-xs">
          <div className="flex items-center gap-1">
            <Calendar className="size-3 shrink-0" />
            <span>{formattedDate}</span>
          </div>

          {canViewReporter ? (
            <div className="flex flex-wrap items-center gap-2">
              {ticket.reporterName && (
                <span className="text-foreground flex items-center gap-1 font-medium">
                  <User className="size-3" />
                  <span className="max-w-[100px] truncate">{ticket.reporterName}</span>
                </span>
              )}
              {ticket.reporterEmail && (
                <span className="flex items-center gap-1">
                  <Mail className="size-3" />
                  <span className="max-w-[120px] truncate">{ticket.reporterEmail}</span>
                </span>
              )}
              {ticket.reporterPhone && (
                <span className="flex items-center gap-1">
                  <Phone className="size-3" />
                  <span>{ticket.reporterPhone}</span>
                </span>
              )}
            </div>
          ) : (
            <span className="text-muted-foreground/60 italic">通報人資訊受保護</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
