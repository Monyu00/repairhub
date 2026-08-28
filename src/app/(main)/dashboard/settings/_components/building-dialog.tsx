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

interface BuildingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  initialData?: { name: string; code: string } | null;
  onSubmit: (name: string, code: string) => Promise<{ success: boolean; error?: string | null }>;
}

export function BuildingDialog({ open, onOpenChange, mode, initialData, onSubmit }: BuildingDialogProps) {
  const [name, setName] = useState(initialData?.name ?? "");
  const [code, setCode] = useState(initialData?.code ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (open) {
      setName(initialData?.name ?? "");
      setCode(initialData?.code ?? "");
      setError(null);
    }
  }, [open, initialData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("大樓名稱不可為空白");
      return;
    }
    if (!code.trim()) {
      setError("大樓代碼不可為空白");
      return;
    }

    setError(null);
    startTransition(async () => {
      const res = await onSubmit(name.trim(), code.trim());
      if (res.success) {
        onOpenChange(false);
      } else {
        setError(res.error ?? "操作失敗");
      }
    });
  };

  const title = mode === "create" ? "新增校園大樓" : "編輯大樓資訊";
  const description =
    mode === "create" ? "請輸入新大樓名稱與代碼（如：行政大樓 / ADMIN）。" : "修改大樓名稱與代碼。代碼必須於全校唯一。";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="building-name">大樓名稱</Label>
              <Input
                id="building-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="例如：行政大樓"
                disabled={isPending}
                autoFocus
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="building-code">大樓代碼</Label>
              <Input
                id="building-code"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="例如：ADMIN"
                disabled={isPending}
              />
            </div>
            {error && <p className="text-destructive text-xs">{error}</p>}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
              取消
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {mode === "create" ? "建立" : "儲存"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
