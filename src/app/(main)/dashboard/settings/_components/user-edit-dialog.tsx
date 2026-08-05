"use client";

import { useEffect, useState, useTransition } from "react";

import { Loader2, ShieldCheck, User } from "lucide-react";

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

import type { UserItem } from "../_actions/user-actions";

interface UserEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserItem | null;
  onSubmit: (
    userId: string,
    data: { displayName: string; role: "admin" | "technician" | null },
  ) => Promise<{ success: boolean; error?: string }>;
}

export function UserEditDialog({ open, onOpenChange, user, onSubmit }: UserEditDialogProps) {
  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState<"admin" | "technician" | "user">("user");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (open && user) {
      setDisplayName(user.displayName ?? "");
      setRole(user.role === "admin" ? "admin" : user.role === "technician" ? "technician" : "user");
      setError(null);
    }
  }, [open, user]);

  if (!user) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const targetRole = role === "admin" ? "admin" : role === "technician" ? "technician" : null;

    startTransition(async () => {
      const res = await onSubmit(user.id, {
        displayName: displayName.trim(),
        role: targetRole,
      });

      if (res.success) {
        onOpenChange(false);
      } else {
        setError(res.error ?? "更新失敗");
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              編輯使用者資訊與權限
            </DialogTitle>
            <DialogDescription>
              變更 <span className="font-mono font-medium text-foreground">{user.email}</span> 的顯示名稱與系統角色。
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="display-name">顯示名稱 (Display Name)</Label>
              <Input
                id="display-name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="例如：張小明 (總務處)"
                disabled={isPending}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="user-role">系統權限角色</Label>
              <Select
                value={role}
                onValueChange={(val) => setRole(val as "admin" | "technician" | "user")}
                disabled={isPending}
              >
                <SelectTrigger id="user-role">
                  <SelectValue placeholder="請選擇角色" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin" className="flex items-center gap-2">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-destructive" />
                      <span>系統管理者 (Admin)</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="technician">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-blue-500" />
                      <span>維修技師 (Technician)</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="user">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                      <span>一般使用者 (User)</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {role === "admin" && "具有全系統完整管理權限（維護設定、類別、設備及指派工單）。"}
                {role === "technician" && "可於維修管理選單中接收、接領工單與填寫處置說明。"}
                {role === "user" && "僅能提出報修申請與檢視個人報修紀錄。"}
              </p>
            </div>

            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-xs font-medium text-destructive">{error}</div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
              取消
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              儲存變更
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
