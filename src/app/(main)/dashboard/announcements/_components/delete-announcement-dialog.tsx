"use client";

import { useTransition } from "react";

import { Loader2 } from "lucide-react";

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
import type { AnnouncementItem } from "@/server/announcements";

interface DeleteAnnouncementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  announcement: AnnouncementItem | null;
  onConfirm: () => Promise<void>;
}

export function DeleteAnnouncementDialog({
  open,
  onOpenChange,
  announcement,
  onConfirm,
}: DeleteAnnouncementDialogProps) {
  const [isPending, startTransition] = useTransition();

  const handleConfirm = (e: React.MouseEvent) => {
    e.preventDefault();
    startTransition(async () => {
      await onConfirm();
      onOpenChange(false);
    });
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>確認刪除此公告？</AlertDialogTitle>
          <AlertDialogDescription>
            您即將刪除公告「<span className="font-semibold text-foreground">{announcement?.title}</span>
            」。刪除後無法復原，前台與後台將立即不再顯示此內容。
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>取消</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            確認刪除
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
