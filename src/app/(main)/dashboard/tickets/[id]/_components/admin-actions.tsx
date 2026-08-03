"use client";

import { useState } from "react";

import { AlertTriangle, Ban, Loader2, RotateCcw } from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

import { cancelTicket, returnToPending } from "../_actions/ticket-actions";
import { AssignTechnicianDialog } from "./assign-technician-dialog";

interface AdminActionsProps {
  ticketId: string;
  status: string;
}

export function AdminActions({ ticketId, status }: AdminActionsProps) {
  // Cancel dialog state
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [isCancelling, setIsCancelling] = useState(false);

  // Return dialog state
  const [returnOpen, setReturnOpen] = useState(false);
  const [isReturning, setIsReturning] = useState(false);

  const canAssign = status === "pending";
  const canCancel = status === "pending" || status === "in_progress";
  const canReturnToPending = status === "in_progress";

  if (!canAssign && !canCancel && !canReturnToPending) {
    return null;
  }

  const handleCancelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancelReason.trim() || isCancelling) return;

    setIsCancelling(true);
    try {
      const result = await cancelTicket(ticketId, cancelReason);
      if (result.success) {
        toast.success("已成功取消報修單據");
        setCancelOpen(false);
        setCancelReason("");
      } else {
        toast.error(result.error || "取消單據失敗");
      }
    } catch (err) {
      console.error("Cancel ticket error:", err);
      toast.error("取消單據時發生網路錯誤");
    } finally {
      setIsCancelling(false);
    }
  };

  const handleReturnToPending = async () => {
    if (isReturning) return;

    setIsReturning(true);
    try {
      const result = await returnToPending(ticketId);
      if (result.success) {
        toast.success("已成功將單據退回待處理狀態");
        setReturnOpen(false);
      } else {
        toast.error(result.error || "退回待處理失敗");
      }
    } catch (err) {
      console.error("Return to pending error:", err);
      toast.error("退回待處理時發生網路錯誤");
    } finally {
      setIsReturning(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2 pt-2">
      {/* Assign technician button */}
      {canAssign && <AssignTechnicianDialog ticketId={ticketId} />}

      {/* Return to pending button */}
      {canReturnToPending && (
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 border-amber-500/30 text-amber-700 text-xs hover:bg-amber-500/10 dark:text-amber-400"
          onClick={() => setReturnOpen(true)}
        >
          <RotateCcw className="size-3.5" />
          <span>退回待處理</span>
        </Button>
      )}

      {/* Cancel ticket button */}
      {canCancel && (
        <Button
          variant="destructive"
          size="sm"
          className="gap-1.5 text-xs shadow-xs"
          onClick={() => setCancelOpen(true)}
        >
          <Ban className="size-3.5" />
          <span>取消報修單</span>
        </Button>
      )}

      {/* Cancel Dialog (Prompt for reason) */}
      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleCancelSubmit}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-destructive">
                <Ban className="size-5" />
                取消報修單據
              </DialogTitle>
              <DialogDescription>
                取消後單據狀態將變更為「已取消」，並向通報人與系統記錄原因。請輸入取消原因：
              </DialogDescription>
            </DialogHeader>

            <div className="py-4">
              <Textarea
                placeholder="輸入取消原因（例如：重複報修、資訊不齊全、已現場自行修復...）"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                rows={3}
                className="resize-none text-xs sm:text-sm"
                disabled={isCancelling}
                autoFocus
              />
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => setCancelOpen(false)} disabled={isCancelling}>
                取消
              </Button>
              <Button
                type="submit"
                variant="destructive"
                disabled={isCancelling || !cancelReason.trim()}
                className="gap-1.5"
              >
                {isCancelling ? <Loader2 className="size-3.5 animate-spin" /> : <Ban className="size-3.5" />}
                <span>確認取消</span>
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Return to pending Alert Dialog */}
      <AlertDialog open={returnOpen} onOpenChange={setReturnOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
              <AlertTriangle className="size-5" />
              確認將單據退回待處理？
            </AlertDialogTitle>
            <AlertDialogDescription>
              退回待處理將會清除目前的指派技師，使該單據重新開放給所有訂閱該類別的技師搶單接單。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isReturning}>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void handleReturnToPending();
              }}
              disabled={isReturning}
              className="gap-1.5 bg-amber-600 text-white hover:bg-amber-700"
            >
              {isReturning && <Loader2 className="size-3.5 animate-spin" />}
              <span>確認退回</span>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
