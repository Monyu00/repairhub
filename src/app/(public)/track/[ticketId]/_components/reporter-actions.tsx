"use client";

import { useState, useTransition } from "react";

import { useRouter } from "next/navigation";

import {
  CheckCircle2Icon,
  Loader2Icon,
  MailIcon,
  MessageSquareWarningIcon,
  RotateCcwIcon,
  StarIcon,
} from "lucide-react";

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
import { cn } from "@/lib/utils";

import { confirmFix, reopenTicket } from "../_actions/track-actions";

type ActionType = "confirm" | "reopen";

interface ReporterActionsProps {
  ticketId: string;
}

const RATING_LABELS: Record<number, string> = {
  1: "非常不滿意",
  2: "不滿意",
  3: "普通",
  4: "滿意",
  5: "非常滿意",
};

export function ReporterActions({ ticketId }: ReporterActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [actionType, setActionType] = useState<ActionType>("confirm");
  const [email, setEmail] = useState("");
  const [feedback, setFeedback] = useState("");
  const [rating, setRating] = useState<number | null>(null);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
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
        result = await confirmFix(ticketId, email, rating ?? undefined);
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
  const activeRating = hoverRating ?? rating;

  return (
    <>
      <div className="space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-foreground">維修驗收</h2>
          <p className="text-xs text-muted-foreground mt-0.5">技師已完成維修，請確認問題是否已解決。</p>
        </div>

        {/* 5-star Rating selector (Optional) */}
        <div className="space-y-2 rounded-lg border border-border/60 bg-muted/30 p-3.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-foreground">維修服務評分（選填）</span>
            <span className="text-xs text-muted-foreground transition-colors">
              {activeRating ? `${activeRating} 星 - ${RATING_LABELS[activeRating]}` : "點選星星評分"}
            </span>
          </div>

          <fieldset className="flex items-center gap-1.5 border-0 m-0 p-0" aria-label="服務評分星等選擇">
            {[1, 2, 3, 4, 5].map((star) => {
              const isFilled = (activeRating ?? 0) >= star;
              return (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating((prev) => (prev === star ? null : star))}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(null)}
                  className="group rounded p-1 transition-transform hover:scale-110 focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring"
                  aria-label={`${star} 星 - ${RATING_LABELS[star]}`}
                  aria-pressed={rating === star}
                >
                  <StarIcon
                    className={cn(
                      "size-6 transition-colors",
                      isFilled
                        ? "fill-amber-400 text-amber-500"
                        : "fill-transparent text-muted-foreground/30 group-hover:text-amber-400/70",
                    )}
                  />
                </button>
              );
            })}
            {rating !== null && (
              <button
                type="button"
                onClick={() => setRating(null)}
                className="ml-2 text-[11px] text-muted-foreground hover:text-foreground underline"
              >
                清除
              </button>
            )}
          </fieldset>
        </div>

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
              {/* Rating reminder in confirmation dialog */}
              {isConfirm && (
                <div className="flex items-center justify-between rounded-md border border-border/60 bg-muted/40 px-3 py-2 text-xs">
                  <span className="text-muted-foreground">服務評分</span>
                  {rating ? (
                    <span className="flex items-center gap-1 font-medium text-foreground">
                      <StarIcon className="size-3.5 fill-amber-400 text-amber-500" />
                      {rating} 星（{RATING_LABELS[rating]}）
                    </span>
                  ) : (
                    <span className="text-muted-foreground/70 italic">未評分（選填）</span>
                  )}
                </div>
              )}

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
