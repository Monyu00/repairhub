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

interface SpaceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  buildingName?: string;
  initialData?: { name: string; floor: number } | null;
  onSubmit: (name: string, floor: number) => Promise<{ success: boolean; error?: string | null }>;
}

export function SpaceDialog({ open, onOpenChange, mode, buildingName, initialData, onSubmit }: SpaceDialogProps) {
  const [name, setName] = useState(initialData?.name ?? "");
  const [floor, setFloor] = useState<number | "">(initialData?.floor ?? 1);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (open) {
      setName(initialData?.name ?? "");
      setFloor(initialData?.floor ?? 1);
      setError(null);
    }
  }, [open, initialData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("空間名稱不可為空白");
      return;
    }
    if (floor === "" || Number.isNaN(Number(floor))) {
      setError("請輸入有效的樓層數值");
      return;
    }

    setError(null);
    startTransition(async () => {
      const res = await onSubmit(name.trim(), Number(floor));
      if (res.success) {
        onOpenChange(false);
      } else {
        setError(res.error ?? "操作失敗");
      }
    });
  };

  const title = mode === "create" ? `在 ${buildingName ?? ""} 新增空間` : "編輯空間資訊";
  const description =
    mode === "create" ? "請輸入空間名稱與所在樓層（例如：校長室 / 3 樓）。" : "修改空間名稱與樓層數值。";

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
              <Label htmlFor="space-name">空間名稱</Label>
              <Input
                id="space-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="例如：校長室、電腦教室 301"
                disabled={isPending}
                autoFocus
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="space-floor">所在樓層 (數字)</Label>
              <Input
                id="space-floor"
                type="number"
                value={floor}
                onChange={(e) => setFloor(e.target.value === "" ? "" : parseInt(e.target.value, 10))}
                placeholder="例如：1 代表 1樓，-1 代表 B1"
                disabled={isPending}
              />
            </div>
            {error && <p className="text-xs text-destructive">{error}</p>}
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
