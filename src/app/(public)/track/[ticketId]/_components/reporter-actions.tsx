"use client";

import { useState, useTransition } from "react";

import { useRouter } from "next/navigation";

import { CheckCircle2Icon, Loader2Icon, MailIcon, MessageSquareWarningIcon, RotateCcwIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

import { confirmFix, reopenTicket } from "../_actions/track-actions";

type ActionType = "confirm" | "reopen";

interface ReporterActionsProps {
  ticketId: string;
}

export function ReporterActions({ ticketId }: ReporterActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [actionType, setActionType] = useState<ActionType>("confirm");
  const [email, setEmail] = useState("");
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function openDialog(type: ActionType) {
    setActionType(type);
    setEmail("");
    setFeedback("");
    setError(null);
    setSuccess(false);
    setDialogOpen(true);
  }

  function handleSubmit() {
    setError(null);

    startTransition(async () => {
      let result: { success: boolean; error?: string };

      if (actionType === "confirm") {
        result = await confirmFix(ticketId, email);
      } else {
        result = await reopenTicket(ticketId, email, feedback);
      }

      if (result.success) {
        setSuccess(true);
        // Refresh the page data after a brief delay so user sees success state
        setTimeout(() => {
          setDialogOpen(false);
          router.refresh();
        }, 1500);
      } else {
        setError(result.error ?? "操作失敗，請稍後再試");
      }
    });
  }

  const isConfirm = actionType === "confirm";

  return (
    <>
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground">維修驗收</h2>
        <p className="text-xs text-muted-foreground">技師已完成維修，請確認問題是否已解決。</p>
        <div className="flex gap-3">
          <Button className="flex-1" onClick={() => openDialog("confirm")}>
            <CheckCircle2Icon className="mr-1.5 size-4" />
            確認修復
          </Button>
          <Button className="flex-1" variant="outline" onClick={() => openDialog("reopen")}>
            <RotateCcwIcon className="mr-1.5 size-4" />
            問題仍在
          </Button>
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{isConfirm ? "確認修復" : "問題仍在"}</DialogTitle>
            <DialogDescription>
              {isConfirm ? "確認後此報修單將結案，無法再次開啟。" : "回報問題仍在，工單將退回維修中，技師會繼續處理。"}
            </DialogDescription>
          </DialogHeader>

          {success ? (
            <div className="flex flex-col items-center gap-2 py-4 text-center">
              <CheckCircle2Icon className="size-10 text-emerald-500" />
              <p className="font-medium text-foreground">
                {isConfirm ? "已確認修復，報修單已結案" : "已回報問題，工單已退回維修中"}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Email verification */}
              <div className="space-y-2">
                <label htmlFor="reporter-email" className="text-sm font-medium text-foreground">
                  <MailIcon className="mr-1.5 inline-block size-4 text-muted-foreground" />
                  驗證身分
                </label>
                <Input
                  id="reporter-email"
                  type="email"
                  placeholder="請輸入報修時使用的電子郵件"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isPending}
                />
                <p className="text-xs text-muted-foreground">請輸入您提交報修時使用的 Email 以驗證身分。</p>
              </div>

              {/* Feedback for reopen only */}
              {!isConfirm && (
                <div className="space-y-2">
                  <label htmlFor="reopen-feedback" className="text-sm font-medium text-foreground">
                    <MessageSquareWarningIcon className="mr-1.5 inline-block size-4 text-muted-foreground" />
                    反饋說明
                  </label>
                  <Textarea
                    id="reopen-feedback"
                    placeholder="請描述問題仍在的情況，例如：「仍會漏水」"
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    disabled={isPending}
                    rows={3}
                  />
                </div>
              )}

              {/* Error display */}
              {error && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                  {error}
                </div>
              )}
            </div>
          )}

          {!success && (
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={isPending}>
                取消
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={isPending || !email.trim() || (!isConfirm && !feedback.trim())}
                variant={isConfirm ? "default" : "destructive"}
              >
                {isPending ? (
                  <>
                    <Loader2Icon className="mr-1.5 size-4 animate-spin" />
                    處理中…
                  </>
                ) : isConfirm ? (
                  "確認修復"
                ) : (
                  "回報問題仍在"
                )}
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
