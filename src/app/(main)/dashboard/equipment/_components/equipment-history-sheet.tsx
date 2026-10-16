"use client";

import { useEffect, useState } from "react";

import { Calendar, ClipboardList, Loader2, User } from "lucide-react";

import { TicketStatusBadge } from "@/app/(main)/dashboard/tickets/_components/ticket-status-badge";
import { Badge } from "@/components/ui/badge";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";

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

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <div className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-muted-foreground" />
            <SheetTitle className="font-bold text-lg">歷史維修紀錄</SheetTitle>
          </div>
          {equipment && (
            <SheetDescription asChild>
              <div className="pt-1 text-muted-foreground text-xs">
                設備：<span className="font-semibold text-foreground">{equipment.name}</span>
                <Badge variant="outline" className="ml-2 font-mono text-[10px]">
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
            <div className="flex h-40 flex-col items-center justify-center gap-2 text-muted-foreground text-sm">
              <Loader2 className="h-5 w-5 animate-spin" />
              載入歷史紀錄中...
            </div>
          )}
          {!isLoading && error && (
            <div className="rounded-md bg-destructive/10 p-3 text-destructive text-xs">{error}</div>
          )}
          {!isLoading && !error && tickets.length === 0 && (
            <Empty className="border border-dashed bg-card/40 py-10">
              <EmptyMedia variant="icon">
                <ClipboardList />
              </EmptyMedia>
              <EmptyHeader>
                <EmptyTitle>尚無維修紀錄</EmptyTitle>
                <EmptyDescription>此設備目前尚無任何報修紀錄。</EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}
          {!isLoading && !error && tickets.length > 0 && (
            <div className="space-y-3">
              <div className="font-medium text-muted-foreground text-xs">共 {tickets.length} 筆維修通報</div>
              {tickets.map((ticket) => (
                <div
                  key={ticket.id}
                  className="space-y-2 rounded-lg border bg-card p-3.5 text-xs shadow-xs transition-colors hover:border-primary/40"
                >
                  <div className="flex items-center justify-between gap-2">
                    <TicketStatusBadge status={ticket.status} />
                    <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      <span>{new Date(ticket.created_at).toLocaleDateString("zh-TW")}</span>
                    </div>
                  </div>

                  <p className="line-clamp-3 whitespace-pre-wrap font-normal text-foreground text-sm">
                    {ticket.description}
                  </p>

                  {ticket.reporter_email && (
                    <div className="flex items-center gap-1 border-border/40 border-t pt-1 text-[11px] text-muted-foreground">
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
