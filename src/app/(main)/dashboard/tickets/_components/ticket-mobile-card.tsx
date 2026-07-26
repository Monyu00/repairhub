import { format } from "date-fns";
import { zhTW } from "date-fns/locale/zh-TW";
import { Calendar, Mail, MapPin, Phone } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

import { TicketStatusBadge } from "./ticket-status-badge";
import type { TicketRow } from "./ticket-types";

interface TicketMobileCardProps {
  ticket: TicketRow;
  canViewReporter: boolean;
}

export function TicketMobileCard({ ticket, canViewReporter }: TicketMobileCardProps) {
  const formattedDate = ticket.created_at
    ? format(new Date(ticket.created_at), "yyyy/MM/dd HH:mm", { locale: zhTW })
    : "-";

  return (
    <Card className="hover:border-primary/40 transition-colors cursor-pointer group shadow-2xs">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between gap-2 border-b border-border/50 pb-2.5">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-semibold text-muted-foreground group-hover:text-primary transition-colors">
              #{ticket.id.slice(0, 8)}
            </span>
            <span className="rounded bg-muted px-1.5 py-0.5 text-xs font-medium">
              {ticket.category.name}
            </span>
          </div>
          <TicketStatusBadge status={ticket.status} />
        </div>

        <div className="space-y-1.5 text-xs">
          <div className="flex items-center gap-1.5 text-foreground font-medium">
            <MapPin className="size-3.5 shrink-0 text-muted-foreground" />
            <span>
              {ticket.space.building.name} - {ticket.space.name} ({ticket.space.floor}F)
            </span>
          </div>

          <p className="line-clamp-2 text-muted-foreground leading-relaxed pl-5">{ticket.description}</p>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border/40 text-[11px] text-muted-foreground">
          <div className="flex items-center gap-1">
            <Calendar className="size-3 shrink-0" />
            <span>{formattedDate}</span>
          </div>

          {canViewReporter ? (
            <div className="flex items-center gap-2">
              {ticket.reporter_email && (
                <span className="flex items-center gap-1">
                  <Mail className="size-3" />
                  <span className="max-w-[120px] truncate">{ticket.reporter_email}</span>
                </span>
              )}
              {ticket.reporter_phone && (
                <span className="flex items-center gap-1">
                  <Phone className="size-3" />
                  <span>{ticket.reporter_phone}</span>
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
