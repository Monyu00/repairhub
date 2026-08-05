"use client";

import { useEffect, useState } from "react";

import { Calendar, ClipboardList, Loader2, User } from "lucide-react";

import { TicketStatusBadge } from "@/app/(main)/dashboard/tickets/_components/ticket-status-badge";
import { Badge } from "@/components/ui/badge";
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
      fetchEquipmentTickets(equipment.id).then((res) => {
        setIsLoading(false);
        if (res.success) {
          setTickets(res.tickets);
        } else {
          setError(res.error ?? "讀取歷史報修單失敗");
          setTickets([]);
        }
      });
    }
  }, [open, equipment]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-muted-foreground" />
            <SheetTitle className="text-lg font-bold">歷史維修紀錄</SheetTitle>
          </div>
          {equipment && (
            <SheetDescription asChild>
              <div className="pt-1 text-xs text-muted-foreground">
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
          {isLoading ? (
            <div className="flex h-40 flex-col items-center justify-center gap-2 text-muted-foreground text-sm">
              <Loader2 className="h-5 w-5 animate-spin" />
              載入歷史紀錄中...
            </div>
          ) : error ? (
            <div className="rounded-md bg-destructive/10 p-3 text-xs text-destructive">{error}</div>
          ) : tickets.length === 0 ? (
            <div className="flex h-40 flex-col items-center justify-center rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground">
              此設備目前尚無任何報修紀錄。
            </div>
          ) : (
            <div className="space-y-3">
              <div className="text-xs font-medium text-muted-foreground">共 {tickets.length} 筆維修通報</div>
              {tickets.map((ticket) => (
                <div
                  key={ticket.id}
                  className="rounded-lg border bg-card p-3.5 shadow-xs space-y-2 text-xs transition-colors hover:border-primary/40"
                >
                  <div className="flex items-center justify-between gap-2">
                    <TicketStatusBadge status={ticket.status} />
                    <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      <span>{new Date(ticket.created_at).toLocaleDateString("zh-TW")}</span>
                    </div>
                  </div>

                  <p className="text-sm font-normal text-foreground line-clamp-3 whitespace-pre-wrap">
                    {ticket.description}
                  </p>

                  {ticket.reporter_email && (
                    <div className="flex items-center gap-1 text-[11px] text-muted-foreground pt-1 border-t border-border/40">
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
