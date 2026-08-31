"use client";

import { useEffect, useState, useTransition } from "react";

import { Loader2, ShieldCheck, User, Wrench } from "lucide-react";

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
    data: {
      displayName: string;
      role: "admin" | "technician" | null;
      department?: string | null;
      phone?: string | null;
    },
  ) => Promise<{ success: boolean; error?: string }>;
}

export function UserEditDialog({ open, onOpenChange, user, onSubmit }: UserEditDialogProps) {
  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState<"admin" | "technician" | "user">("user");
  const [department, setDepartment] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (open && user) {
      setDisplayName(user.displayName ?? "");
      setRole(user.role ?? "user");
      setDepartment(user.department ?? "");
      setPhone(user.phone ?? "");
      setError(null);
    }
  }, [open, user]);

  if (!user) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const targetRole = role === "user" ? null : role;

    startTransition(async () => {
      const res = await onSubmit(user.id, {
        displayName: displayName.trim(),
        role: targetRole,
        department: department.trim() || null,
        phone: phone.trim() || null,
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
      <DialogContent className="sm:max-w-[480px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              編輯使用者資訊與權限
            </DialogTitle>
            <DialogDescription>
              變更 <span className="font-medium font-mono text-foreground">{user.email}</span> 的個人資料與系統角色。
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-display-name">顯示名稱 (Display Name)</Label>
              <Input
                id="edit-display-name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="例如：張小明"
                disabled={isPending}
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="edit-department">所屬部門 / 單位</Label>
                <Input
                  id="edit-department"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder="例如：總務處 事務組"
                  disabled={isPending}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="edit-phone">聯絡電話 / 分機</Label>
                <Input
                  id="edit-phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="例如：0912-345-678 或 #1234"
                  disabled={isPending}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edit-user-role">系統權限角色</Label>
              <Select
                value={role}
                onValueChange={(val) => setRole(val as "admin" | "technician" | "user")}
                disabled={isPending}
              >
                <SelectTrigger id="edit-user-role">
                  <SelectValue placeholder="請選擇角色" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                      <span>系統管理者 (Admin)</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="technician">
                    <div className="flex items-center gap-2">
                      <Wrench className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      <span>維修技師 (Technician)</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="user">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                      <span>一般使用者 (User)</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-muted-foreground text-xs">
                {role === "admin" && "具有全系統完整管理權限（維護設定、類別、設備及指派工單）。"}
                {role === "technician" && "可於維修管理選單中接收、接領工單與填寫處置說明。"}
                {role === "user" && "僅能提出報修申請與檢視個人報修紀錄。"}
              </p>
            </div>

            {error && (
              <div className="rounded-md bg-destructive/10 p-3 font-medium text-destructive text-xs">{error}</div>
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
