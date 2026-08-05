"use client";

import { useEffect, useState } from "react";

import { AlertTriangle, Loader2 } from "lucide-react";

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

import { checkEquipmentTicketsCount, deleteEquipment } from "../_actions/equipment-actions";

interface EquipmentDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  equipment: { id: string; name: string; code: string } | null;
  onSuccess: () => void;
}

export function EquipmentDeleteDialog({ open, onOpenChange, equipment, onSuccess }: EquipmentDeleteDialogProps) {
  const [isPending, setIsPending] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [ticketCount, setTicketCount] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (open && equipment) {
      setErrorMessage(null);
      setIsChecking(true);
      checkEquipmentTicketsCount(equipment.id).then((res) => {
        setIsChecking(false);
        if (res.success) {
          setTicketCount(res.count);
        } else {
          setTicketCount(0);
        }
      });
    }
  }, [open, equipment]);

  const handleConfirm = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!equipment) return;

    setIsPending(true);
    setErrorMessage(null);

    const res = await deleteEquipment(equipment.id);
    setIsPending(false);

    if (res.success) {
      onOpenChange(false);
      onSuccess();
    } else {
      setErrorMessage(res.error ?? "刪除失敗");
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent size="default">
        <AlertDialogHeader>
          <AlertDialogTitle>確定要刪除設備「{equipment?.name}」？</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2">
              <p>
                這將會從系統中移除設備紀錄（代碼：<span className="font-mono">{equipment?.code}</span>）。
              </p>

              {isChecking ? (
                <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  檢查報修紀錄中...
                </div>
              ) : ticketCount > 0 ? (
                <div className="flex items-start gap-2 rounded-md bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-400 border border-amber-500/20">
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold">警告：</span>此設備已有 {ticketCount} 筆歷史報修單引用。
                    刪除設備後，相關報修單的設備關聯將自動設為空值（報修單仍會保留）。
                  </div>
                </div>
              ) : null}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        {errorMessage && (
          <div className="rounded-md bg-destructive/10 p-3 text-xs text-destructive">{errorMessage}</div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending} onClick={() => onOpenChange(false)}>
            取消
          </AlertDialogCancel>
          <AlertDialogAction variant="destructive" disabled={isPending || isChecking} onClick={handleConfirm}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            確認刪除
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
