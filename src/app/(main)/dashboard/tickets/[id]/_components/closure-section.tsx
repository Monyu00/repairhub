"use client";

import { useState } from "react";

import { CheckCircle2, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

import { submitClosure } from "../_actions/ticket-actions";
import { PhotoUpload } from "./photo-upload";

interface ClosureSectionProps {
  ticketId: string;
}

export function ClosureSection({ ticketId }: ClosureSectionProps) {
  const [photos, setPhotos] = useState<string[]>([]);
  const [summary, setSummary] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (photos.length === 0) {
      setErrorMsg("結案需上傳完工證明照片");
      toast.error("結案需上傳完工證明照片");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await submitClosure(ticketId, summary, photos);
      if (result.success) {
        toast.success("已成功完成結案");
      } else {
        setErrorMsg(result.error ?? "提交結案失敗");
        toast.error(result.error ?? "提交結案失敗");
      }
    } catch (err) {
      console.error("Closure error:", err);
      toast.error("提交結案時發生錯誤，請稍後再試");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="border-emerald-500/30 bg-emerald-500/5 shadow-2xs dark:bg-emerald-950/10">
      <CardHeader className="border-emerald-500/20 border-b pb-3">
        <CardTitle className="flex items-center gap-2 font-semibold text-base text-emerald-700 dark:text-emerald-400">
          <CheckCircle2 className="size-4" />
          維修完工與提交結案
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Photo Upload Area */}
          <div className="space-y-2">
            <div className="flex items-center justify-between font-semibold text-foreground text-xs">
              <span className="flex items-center gap-1.5">
                <Upload className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                完工照片上傳
                <span className="text-destructive">*</span>
              </span>
              <span className="font-normal font-normal text-[11px] text-muted-foreground">(至少 1 張，至多 3 張)</span>
            </div>

            <PhotoUpload
              photos={photos}
              onChange={(updated) => {
                setPhotos(updated);
                if (updated.length > 0) setErrorMsg(null);
              }}
              maxPhotos={3}
              disabled={isSubmitting}
            />
          </div>

          {/* Closure Summary */}
          <div className="space-y-1.5">
            <label htmlFor="closure-summary" className="font-semibold text-foreground text-xs">
              完工說明與備註 (選填)
            </label>
            <Textarea
              id="closure-summary"
              placeholder="說明維修方式、更換零件或建議事項..."
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              rows={3}
              className="resize-none bg-background text-xs sm:text-sm"
              disabled={isSubmitting}
            />
          </div>

          {errorMsg && <p className="font-semibold text-destructive text-xs">{errorMsg}</p>}

          <div className="flex justify-end pt-1">
            <Button
              type="submit"
              variant="default"
              className="gap-2 bg-emerald-600 font-medium text-white shadow-xs hover:bg-emerald-700"
              disabled={isSubmitting}
            >
              {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
              <span>{isSubmitting ? "結案處理中..." : "提交結案"}</span>
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
