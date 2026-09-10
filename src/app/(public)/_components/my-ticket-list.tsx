"use client";

import { useState, useTransition } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { Calendar, CheckCircle2, ExternalLink, Inbox, Loader2, Lock, MapPin, Plus, RotateCcw } from "lucide-react";

import { TicketStatusBadge } from "@/app/(main)/dashboard/tickets/_components/ticket-status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { formatTicketDate } from "@/lib/formatters";
import type { TicketRecord } from "@/server/tickets/query";

import { confirmFix, reopenTicket } from "../track/[ticketId]/_actions/track-actions";
import { TicketPagination } from "./ticket-pagination";

interface MyTicketListProps {
  tickets: TicketRecord[];
  userEmail: string | null;
  currentPage: number;
  totalPages: number;
  totalCount: number;
  pageSize: number;
}

export function MyTicketList({ tickets, userEmail, currentPage, totalPages, totalCount, pageSize }: MyTicketListProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Dialog state for reopen/confirm
  const [activeDialog, setActiveDialog] = useState<{
    type: "confirm" | "reopen";
    ticketId: string;
  } | null>(null);
  const [feedback, setFeedback] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!userEmail) {
    return (
      <div className="flex min-h-[300px] flex-col items-center justify-center rounded-xl border border-border border-dashed bg-card/40 p-8 text-center">
        <div className="mb-3 flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <Lock className="size-6" />
        </div>
        <h3 className="font-semibold text-base text-foreground">請先登入以檢視個人報修紀錄</h3>
        <p className="mt-1 max-w-sm text-muted-foreground text-xs">
          使用您的校園帳號登入後，即可追蹤所有由您發起的報修單進度與進行完工驗收。
        </p>
        <Button asChild size="sm" className="mt-4 gap-1.5">
          <Link href="/login">前往登入</Link>
        </Button>
      </div>
    );
  }

  if (tickets.length === 0) {
    return (
      <div className="flex min-h-[300px] flex-col items-center justify-center rounded-xl border border-border border-dashed bg-card/40 p-8 text-center">
        <div className="mb-3 flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <Inbox className="size-6" />
        </div>
        <h3 className="font-semibold text-base text-foreground">您目前尚無報修紀錄</h3>
        <p className="mt-1 max-w-sm text-muted-foreground text-xs">若有校園設備損壞或需修繕項目，歡迎立即通報。</p>
        <Button asChild size="sm" className="mt-4 gap-1.5">
          <Link href="/report">
            <Plus className="size-4" />
            我要報修
          </Link>
        </Button>
      </div>
    );
  }

  const handleAction = () => {
    if (!activeDialog) return;
    setErrorMsg(null);

    startTransition(async () => {
      let result: { success: boolean; error?: string };
      if (activeDialog.type === "confirm") {
        result = await confirmFix(activeDialog.ticketId, userEmail);
      } else {
        if (!feedback.trim()) {
          setErrorMsg("請填寫問題說明");
          return;
        }
        result = await reopenTicket(activeDialog.ticketId, userEmail, feedback.trim());
      }

      if (result.success) {
        setActiveDialog(null);
        setFeedback("");
        router.refresh();
      } else {
        setErrorMsg(result.error ?? "操作失敗，請稍後再試");
      }
    });
  };

  return (
    <div className="space-y-4">
      {/* Cards list */}
      <div className="grid gap-3">
        {tickets.map((ticket) => {
          const formattedDate = formatTicketDate(ticket.createdAt);
          const isCompleted = ticket.status === "completed";

          return (
            <Card
              key={ticket.id}
              className="border border-border shadow-2xs transition-all hover:border-primary/40 hover:shadow-xs"
            >
              <CardContent className="flex flex-col gap-3 p-4 sm:p-5">
                {/* Header row */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono font-semibold text-muted-foreground text-xs">
                      #{ticket.id.slice(0, 8)}
                    </span>
                    <Badge variant="secondary" className="px-2 py-0.5 text-xs">
                      {ticket.category.name}
                    </Badge>
                    <TicketStatusBadge status={ticket.status} />
                  </div>

                  <Link
                    href={`/track/${ticket.id}`}
                    className="inline-flex items-center gap-1 text-muted-foreground text-xs transition-colors hover:text-primary"
                  >
                    <span>案件詳情</span>
                    <ExternalLink className="size-3" />
                  </Link>
                </div>

                {/* Description */}
                <p className="line-clamp-2 text-foreground text-sm leading-relaxed">{ticket.description}</p>

                {/* Details bar */}
                <div className="flex flex-wrap items-center justify-between gap-y-2 border-border/50 border-t pt-2 text-muted-foreground text-xs">
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="size-3.5 shrink-0" />
                      {ticket.space.building.name} - {ticket.space.name} ({ticket.space.floor}F)
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="size-3.5 shrink-0" />
                      {formattedDate}
                    </span>
                  </div>

                  {/* Inline actions for completed tickets */}
                  {isCompleted && (
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-destructive text-xs hover:bg-destructive/10"
                        onClick={() => {
                          setActiveDialog({ type: "reopen", ticketId: ticket.id });
                          setFeedback("");
                          setErrorMsg(null);
                        }}
                      >
                        <RotateCcw className="mr-1 size-3" />
                        問題仍在
                      </Button>
                      <Button
                        size="sm"
                        className="h-7 bg-emerald-600 text-white text-xs hover:bg-emerald-700"
                        onClick={() => {
                          setActiveDialog({ type: "confirm", ticketId: ticket.id });
                          setErrorMsg(null);
                        }}
                      >
                        <CheckCircle2 className="mr-1 size-3" />
                        確認修復
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Pagination */}
      <TicketPagination currentPage={currentPage} totalPages={totalPages} totalCount={totalCount} pageSize={pageSize} />

      {/* Action Dialog */}
      <Dialog
        open={Boolean(activeDialog)}
        onOpenChange={(open) => {
          if (!open) setActiveDialog(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{activeDialog?.type === "confirm" ? "確認修復並結案" : "回報問題未解決"}</DialogTitle>
            <DialogDescription>
              {activeDialog?.type === "confirm"
                ? "確認後此案件將標記為已結案，感謝您的協助與回報。"
                : "若技師維修後問題依然存在，請填寫說明，案件將退回維修中供技師再次處理。"}
            </DialogDescription>
          </DialogHeader>

          {activeDialog?.type === "reopen" && (
            <div className="space-y-2 py-2">
              <label htmlFor="feedback-text" className="font-medium text-foreground text-xs">
                問題反饋說明 <span className="text-destructive">*</span>
              </label>
              <Textarea
                id="feedback-text"
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="請描述仍存在的問題或異常情況..."
                rows={3}
                className="text-xs"
              />
            </div>
          )}

          {errorMsg && <p className="text-destructive text-xs">{errorMsg}</p>}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isPending}
              onClick={() => setActiveDialog(null)}
            >
              取消
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={isPending}
              onClick={handleAction}
              className={activeDialog?.type === "confirm" ? "bg-emerald-600 text-white hover:bg-emerald-700" : ""}
            >
              {isPending && <Loader2 className="mr-1.5 size-3.5 animate-spin" />}
              {activeDialog?.type === "confirm" ? "確認結案" : "送出反饋"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
