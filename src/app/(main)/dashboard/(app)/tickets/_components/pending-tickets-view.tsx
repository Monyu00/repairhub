"use client";

import { useCallback, useEffect, useState } from "react";

import { ClipboardCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { createClient } from "@/lib/supabase/client";
import { getTicketById, queryTickets, type TicketRecord } from "@/server/tickets/query";

import { claimTicket } from "../[id]/_actions/ticket-actions";
import { PendingTicketCard } from "./pending-ticket-card";

interface PendingTicketsViewProps {
  userId: string;
  canViewReporter: boolean;
}

export function PendingTicketsView({ userId, canViewReporter }: PendingTicketsViewProps) {
  const [tickets, setTickets] = useState<TicketRecord[]>([]);
  const [subscribedCategoryIds, setSubscribedCategoryIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const supabase = createClient();

  const fetchSingleTicket = useCallback(
    async (ticketId: string): Promise<TicketRecord | null> => {
      return getTicketById(supabase, ticketId, {
        role: canViewReporter ? "technician" : null,
        userId,
      });
    },
    [supabase, canViewReporter, userId],
  );

  // Initial data fetch
  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      setIsLoading(true);

      // 1. Fetch technician's subscribed categories
      const { data: techCats, error: techCatsError } = await supabase
        .from("technician_categories")
        .select("category_id")
        .eq("technician_id", userId);

      if (techCatsError) {
        console.error("Error fetching technician categories:", techCatsError);
      }

      const catIds = (techCats ?? []).map((tc) => tc.category_id);
      if (isMounted) {
        setSubscribedCategoryIds(catIds);
      }

      if (catIds.length === 0) {
        if (isMounted) {
          setTickets([]);
          setIsLoading(false);
        }
        return;
      }

      // 2. Fetch pending tickets in subscribed categories using deep queryTickets
      const { tickets: pendingTickets } = await queryTickets(supabase, {
        status: "pending",
        categoryId: catIds,
        viewerContext: {
          role: canViewReporter ? "technician" : null,
          userId,
        },
      });

      if (isMounted) {
        setTickets(pendingTickets);
        setIsLoading(false);
      }
    }

    void loadData();

    return () => {
      isMounted = false;
    };
  }, [userId, supabase, canViewReporter]);

  // Realtime subscription setup
  useEffect(() => {
    if (subscribedCategoryIds.length === 0) return;

    const channelName = `technician-pending-tickets-${userId}`;
    const channel = supabase.channel(channelName);

    channel
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "tickets",
          filter: "status=eq.pending",
        },
        async (payload) => {
          const newRecord = payload.new as { id: string; category_id: string; status: string };
          if (newRecord.status === "pending" && subscribedCategoryIds.includes(newRecord.category_id)) {
            const fetched = await fetchSingleTicket(newRecord.id);
            if (fetched) {
              setTickets((prev) => {
                if (prev.some((t) => t.id === fetched.id)) return prev;
                return [fetched, ...prev];
              });
            }
          }
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "tickets",
        },
        (payload) => {
          const updatedRecord = payload.new as { id: string; status: string };
          if (updatedRecord.status !== "pending") {
            setTickets((prev) => prev.filter((t) => t.id !== updatedRecord.id));
          }
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId, subscribedCategoryIds, supabase, fetchSingleTicket]);

  const handleClaim = async (ticketId: string) => {
    try {
      const res = await claimTicket(ticketId);

      if (!res.success) {
        toast.error(res.error ?? "此案件已在處理中或接單失敗");
        setTickets((prev) => prev.filter((t) => t.id !== ticketId));
        return;
      }

      toast.success("已成功接單");
      setTickets((prev) => prev.filter((t) => t.id !== ticketId));
    } catch (err) {
      console.error("Failed to claim ticket:", err);
      toast.error("無法執行搶單，請檢查網路連線");
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-16 text-muted-foreground">
        <Loader2 className="size-6 animate-spin text-primary" />
        <span className="font-medium text-sm">載入待處理案件中...</span>
      </div>
    );
  }

  if (subscribedCategoryIds.length === 0) {
    return (
      <Empty className="my-8 border border-dashed bg-card/40 py-12">
        <EmptyMedia variant="icon">
          <ClipboardCheck className="size-6 text-muted-foreground" />
        </EmptyMedia>
        <EmptyHeader>
          <EmptyTitle>未訂閱任何報修類別</EmptyTitle>
          <EmptyDescription>
            您目前尚未訂閱任何專業維修類別，無法接收待處理單據。請聯絡管理者設定您的專業類別。
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  if (tickets.length === 0) {
    return (
      <Empty className="my-8 border border-dashed bg-card/40 py-12">
        <EmptyMedia variant="icon">
          <ClipboardCheck className="size-6 text-muted-foreground" />
        </EmptyMedia>
        <EmptyHeader>
          <EmptyTitle>目前無待處理案件</EmptyTitle>
          <EmptyDescription>您訂閱的專業類別中尚無未派單的待處理案件。當有新通報時將會即時在此顯示。</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-1 text-muted-foreground text-xs">
        <span>
          共 <strong className="font-semibold text-foreground">{tickets.length}</strong> 筆待處理案件 (即時連線中)
        </span>
      </div>
      <div className="grid gap-3 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {tickets.map((ticket) => (
          <PendingTicketCard key={ticket.id} ticket={ticket} canViewReporter={canViewReporter} onClaim={handleClaim} />
        ))}
      </div>
    </div>
  );
}
