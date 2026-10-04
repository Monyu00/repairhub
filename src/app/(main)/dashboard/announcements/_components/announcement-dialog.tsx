"use client";

import { useEffect, useState, useTransition } from "react";

import { Loader2 } from "lucide-react";

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
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type {
  AnnouncementAudience,
  AnnouncementCategory,
  AnnouncementItem,
  CreateAnnouncementInput,
  UpdateAnnouncementInput,
} from "@/server/announcements";

interface AnnouncementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  announcement?: AnnouncementItem | null;
  onSubmit: (
    data: CreateAnnouncementInput | UpdateAnnouncementInput,
  ) => Promise<{ success: boolean; error?: string | null }>;
}

export function AnnouncementDialog({ open, onOpenChange, announcement, onSubmit }: AnnouncementDialogProps) {
  const isEditing = Boolean(announcement);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState<AnnouncementCategory>("general");
  const [audience, setAudience] = useState<AnnouncementAudience>("all");
  const [isPinned, setIsPinned] = useState(false);
  const [expiresAt, setExpiresAt] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (open) {
      if (announcement) {
        setTitle(announcement.title);
        setBody(announcement.body);
        setCategory(announcement.category ?? "general");
        setAudience(announcement.audience);
        setIsPinned(announcement.is_pinned);
        // Format ISO timestamp to YYYY-MM-DDTHH:mm for datetime-local input
        if (announcement.expires_at) {
          const date = new Date(announcement.expires_at);
          const localIso = new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
          setExpiresAt(localIso);
        } else {
          setExpiresAt("");
        }
      } else {
        setTitle("");
        setBody("");
        setCategory("general");
        setAudience("all");
        setIsPinned(false);
        setExpiresAt("");
      }
      setError(null);
    }
  }, [open, announcement]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTitle = title.trim();
    const cleanBody = body.trim();

    if (!cleanTitle) {
      setError("公告標題不可為空白");
      return;
    }

    if (!cleanBody) {
      setError("公告內文不可為空白");
      return;
    }

    let parsedExpiresAt: string | null = null;
    if (expiresAt) {
      const expDate = new Date(expiresAt);
      if (Number.isNaN(expDate.getTime())) {
        setError("請輸入有效的到期時間");
        return;
      }
      parsedExpiresAt = expDate.toISOString();
    }

    setError(null);
    startTransition(async () => {
      const payload: CreateAnnouncementInput = {
        title: cleanTitle,
        body: cleanBody,
        category,
        audience,
        is_pinned: isPinned,
        expires_at: parsedExpiresAt,
      };

      const res = await onSubmit(payload);
      if (res.success) {
        onOpenChange(false);
      } else {
        setError(res.error ?? "儲存失敗");
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{isEditing ? "編輯公告" : "發佈新公告"}</DialogTitle>
            <DialogDescription>
              {isEditing
                ? "更新現有公告內容、分類、可見範圍或到期設定。"
                : "填寫公告標題與內容，發佈後將依受眾設定於前台或後台顯示。"}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Title */}
            <div className="grid gap-1.5">
              <Label htmlFor="announcement-title">公告標題</Label>
              <Input
                id="announcement-title"
                name="title"
                autoComplete="off"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="例如：系統定期維護停機通知…"
                disabled={isPending}
                autoFocus
              />
            </div>

            {/* Category & Audience row */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor="announcement-category">公告分類</Label>
                <Select
                  value={category}
                  onValueChange={(val) => setCategory(val as AnnouncementCategory)}
                  disabled={isPending}
                >
                  <SelectTrigger id="announcement-category">
                    <SelectValue placeholder="選擇分類" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">一般公告</SelectItem>
                    <SelectItem value="system_maintenance">系統維護</SelectItem>
                    <SelectItem value="outage">停機通知</SelectItem>
                    <SelectItem value="policy">政策公告</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="announcement-audience">發佈受眾</Label>
                <Select
                  value={audience}
                  onValueChange={(val) => setAudience(val as AnnouncementAudience)}
                  disabled={isPending}
                >
                  <SelectTrigger id="announcement-audience">
                    <SelectValue placeholder="選擇受眾" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全體對象（公開 + 內部）</SelectItem>
                    <SelectItem value="internal">僅內部人員（後台）</SelectItem>
                    <SelectItem value="public">僅前台訪客（報修者）</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Pin switch */}
            <div className="flex h-10 items-center justify-between rounded-md border border-input px-3">
              <div>
                <Label htmlFor="announcement-pin" className="cursor-pointer font-medium text-sm">
                  置頂顯示
                </Label>
                <p className="text-muted-foreground text-xs">置頂公告將排在列表最前端</p>
              </div>
              <Switch id="announcement-pin" checked={isPinned} onCheckedChange={setIsPinned} disabled={isPending} />
            </div>

            {/* Expires At */}
            <div className="grid gap-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="announcement-expires">自動到期時間（可選）</Label>
                {expiresAt && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-auto p-0 text-muted-foreground text-xs hover:text-foreground"
                    onClick={() => setExpiresAt("")}
                    disabled={isPending}
                  >
                    清除到期時間（永不過期）
                  </Button>
                )}
              </div>
              <Input
                id="announcement-expires"
                name="expires_at"
                type="datetime-local"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                disabled={isPending}
              />
              <p className="text-muted-foreground text-xs">
                留空代表永不到期，到達設定時間後將自動在前台及總覽中隱藏。
              </p>
            </div>

            {/* Body */}
            <div className="grid gap-1.5">
              <Label htmlFor="announcement-body">公告內文</Label>
              <Textarea
                id="announcement-body"
                name="body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="請輸入公告詳細說明內容…"
                rows={5}
                disabled={isPending}
              />
            </div>

            {error && <p className="font-medium text-destructive text-sm">{error}</p>}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
              取消
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
              {isEditing ? "儲存更新" : "立即發佈"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
