"use client";

import { useState } from "react";

import { useRouter } from "next/navigation";

import { format } from "date-fns";
import { zhTW } from "date-fns/locale/zh-TW";
import { Calendar, Hand, Loader2, Mail, MapPin, Phone, User } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

import { TicketStatusBadge } from "./ticket-status-badge";
import type { TicketRow } from "./ticket-types";

interface PendingTicketCardProps {
  ticket: TicketRow;
  canViewReporter: boolean;
  onClaim: (ticketId: string) => Promise<void>;
}

export function PendingTicketCard({ ticket, canViewReporter, onClaim }: PendingTicketCardProps) {
  const router = useRouter();
  const [isClaiming, setIsClaiming] = useState(false);

  const formattedDate = ticket.created_at
    ? format(new Date(ticket.created_at), "yyyy/MM/dd HH:mm", { locale: zhTW })
    : "-";

  const handleCardClick = () => {
    router.push(`/dashboard/tickets/${ticket.id}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.key === "Enter" || e.key === " ") && e.target === e.currentTarget) {
      e.preventDefault();
      handleCardClick();
    }
  };

  const handleClaimClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsClaiming(true);
    try {
      await onClaim(ticket.id);
    } finally {
      setIsClaiming(false);
    }
  };

  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={handleCardClick}
      onKeyDown={handleKeyDown}
      className="group cursor-pointer shadow-2xs transition-colors hover:border-primary/40 focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring"
    >
      <CardContent className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1">
            <span className="font-mono font-semibold text-muted-foreground text-xs transition-colors group-hover:text-primary">
              #{ticket.id.slice(0, 8)}
            </span>
            <span className="block font-medium text-foreground text-xs">{ticket.category.name}</span>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <TicketStatusBadge status={ticket.status} />
            <Button
              size="xs"
              variant="default"
              className="h-6 gap-1 px-2 text-xs"
              onClick={handleClaimClick}
              disabled={isClaiming}
            >
              {isClaiming ? <Loader2 className="size-3 animate-spin" /> : <Hand className="size-3" />}
              {isClaiming ? "接單中..." : "立即接單"}
            </Button>
          </div>
        </div>

        <div className="space-y-1 text-xs">
          <div className="flex items-center gap-1.5 font-medium text-foreground">
            <MapPin className="size-3.5 shrink-0 text-muted-foreground" />
            <span>
              {ticket.space.building.name} - {ticket.space.name} ({ticket.space.floor}F)
            </span>
          </div>

          <p className="line-clamp-2 pl-5 text-muted-foreground leading-relaxed">{ticket.description}</p>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-border/40 border-t pt-2 text-[11px] text-muted-foreground">
          <div className="flex items-center gap-1">
            <Calendar className="size-3 shrink-0" />
            <span>{formattedDate}</span>
          </div>

          {canViewReporter ? (
            <div className="flex flex-wrap items-center gap-2">
              {ticket.reporter_name && (
                <span className="flex items-center gap-1 font-medium text-foreground">
                  <User className="size-3" />
                  <span className="max-w-[100px] truncate">{ticket.reporter_name}</span>
                </span>
              )}
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
