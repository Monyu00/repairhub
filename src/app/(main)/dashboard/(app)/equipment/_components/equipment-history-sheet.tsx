"use client";

import { useEffect, useState } from "react";

import { Calendar, ClipboardList, Loader2, User } from "lucide-react";

import { TicketStatusBadge } from "@/components/tickets/ticket-status-badge";
import { Badge } from "@/components/ui/badge";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { formatDateOnly } from "@/lib/formatters";

import {
  type EquipmentRow,
  type EquipmentTicketHistoryItem,
  fetchEquipmentTickets,
} from "../_actions/equipment-actions";

interface EquipmentHistorySheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  equipment: EquipmentRow | null;
}

export function EquipmentHistorySheet({ open, onOpenChange, equipment }: EquipmentHistorySheetProps) {
  const [tickets, setTickets] = useState<EquipmentTicketHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && equipment) {
      setIsLoading(true);
      setError(null);
      fetchEquipmentTickets(equipment.id)
        .then((res) => {
          setIsLoading(false);
          if (res.success) {
            setTickets(res.tickets);
          } else {
            setError(res.error ?? "讀取歷史報修單失敗");
            setTickets([]);
          }
        })
        .catch(() => {
          setIsLoading(false);
          setError("讀取歷史報修單失敗");
          setTickets([]);
        });
    }
  }, [open, equipment]);

  const isReady = !isLoading && !error;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <div className="flex items-center gap-2">
            <ClipboardList className="text-muted-foreground h-5 w-5" />
            <SheetTitle className="text-lg font-bold">歷史維修紀錄</SheetTitle>
          </div>
          {equipment && (
            <SheetDescription asChild>
              <div className="text-muted-foreground pt-1 text-xs">
                設備：<span className="text-foreground font-semibold">{equipment.name}</span>
                <Badge variant="outline" className="ml-2 font-mono">
                  {equipment.code}
                </Badge>
                <div className="mt-1">
                  位置：{equipment.space.building.name} / {equipment.space.name}
                </div>
              </div>
            </SheetDescription>
          )}
        </SheetHeader>

        <div className="mt-6 space-y-4 px-1">
          {isLoading && (
            <div className="text-muted-foreground flex h-40 flex-col items-center justify-center gap-2 text-sm">
              <Loader2 className="h-5 w-5 animate-spin" />
              載入歷史紀錄中...
            </div>
          )}
          {!isLoading && error && (
            <div className="bg-destructive/10 text-destructive rounded-md p-3 text-xs">{error}</div>
          )}
          {isReady && tickets.length === 0 && (
            <Empty className="bg-card/40 border border-dashed py-10">
              <EmptyMedia variant="icon">
                <ClipboardList />
              </EmptyMedia>
              <EmptyHeader>
                <EmptyTitle>尚無維修紀錄</EmptyTitle>
                <EmptyDescription>此設備目前尚無任何報修紀錄。</EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}
          {isReady && tickets.length > 0 && (
            <div className="space-y-3">
              <div className="text-muted-foreground text-xs font-medium">共 {tickets.length} 筆維修通報</div>
              {tickets.map((ticket) => (
                <div
                  key={ticket.id}
                  className="bg-card hover:border-primary/40 space-y-2 rounded-lg border p-3.5 text-xs shadow-xs transition-colors"
                >
                  <div className="flex items-center justify-between gap-2">
                    <TicketStatusBadge status={ticket.status} />
                    <div className="text-muted-foreground flex items-center gap-1 text-xs">
                      <Calendar className="h-3 w-3" />
                      <span>{formatDateOnly(ticket.created_at)}</span>
                    </div>
                  </div>

                  <p className="text-foreground line-clamp-3 text-sm font-normal whitespace-pre-wrap">
                    {ticket.description}
                  </p>

                  {ticket.reporter_email && (
                    <div className="border-border/40 text-muted-foreground flex items-center gap-1 border-t pt-1 text-xs">
                      <User className="h-3 w-3" />
                      <span>報修人：{ticket.reporter_email}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
