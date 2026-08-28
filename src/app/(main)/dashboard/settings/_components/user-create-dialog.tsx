"use client";

import { useState, useTransition } from "react";

import { Eye, EyeOff, KeyRound, Loader2, ShieldCheck, User, UserPlus, Wrench } from "lucide-react";

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

import { createUser } from "../_actions/user-actions";

interface UserCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (email: string, password: string) => void;
}

export function UserCreateDialog({ open, onOpenChange, onCreated }: UserCreateDialogProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [department, setDepartment] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<"admin" | "technician" | "user">("user");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleGeneratePassword = () => {
    const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%";
    let generated = "";
    for (let i = 0; i < 12; i++) {
      generated += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(generated);
    setShowPassword(true);
  };

  const handleResetForm = () => {
    setEmail("");
    setPassword("");
    setShowPassword(false);
    setDisplayName("");
    setDepartment("");
    setPhone("");
    setRole("user");
    setError(null);
  };

  function resolveDbRole(role: "admin" | "technician" | "user"): "admin" | "technician" | null {
    if (role === "admin") return "admin";
    if (role === "technician") return "technician";
    return null;
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !email.includes("@")) {
      setError("請輸入有效的 Email 地址");
      return;
    }
    if (!password.trim() || password.trim().length < 6) {
      setError("密碼長度至少需為 6 個字元");
      return;
    }

    const trimmedPassword = password.trim();
    const trimmedEmail = email.trim();
    const targetRole = resolveDbRole(role);

    startTransition(async () => {
      const res = await createUser({
        email: trimmedEmail,
        password: trimmedPassword,
        displayName: displayName.trim() || undefined,
        role: targetRole,
        department: department.trim() || undefined,
        phone: phone.trim() || undefined,
      });

      if (res.success) {
        onOpenChange(false);
        handleResetForm();
        onCreated(trimmedEmail, trimmedPassword);
      } else {
        setError(res.error ?? "建立使用者失敗");
      }
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) handleResetForm();
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-primary" />
              新增系統使用者
            </DialogTitle>
            <DialogDescription>直接建立使用者帳號與個人檔案。建立完成後將顯示帳號密碼供您複製分享。</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="create-email">
                電子郵件 (Email) <span className="text-destructive">*</span>
              </Label>
              <Input
                id="create-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@example.com"
                required
                disabled={isPending}
              />
            </div>

            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="create-password">
                  初始密碼 <span className="text-destructive">*</span>
                </Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 text-primary text-xs hover:text-primary/80"
                  onClick={handleGeneratePassword}
                  disabled={isPending}
                >
                  <KeyRound className="mr-1.5 h-3.5 w-3.5" />
                  自動產生隨機密碼
                </Button>
              </div>
              <div className="relative">
                <Input
                  id="create-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="至少 6 個字元"
                  className="pr-10 font-mono"
                  required
                  disabled={isPending}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  className="absolute top-2 right-2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="create-display-name">顯示姓名 (Display Name)</Label>
              <Input
                id="create-display-name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="例如：王大明"
                disabled={isPending}
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="create-department">所屬部門 / 單位</Label>
                <Input
                  id="create-department"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder="例如：總務處 營繕組"
                  disabled={isPending}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="create-phone">聯絡電話 / 分機</Label>
                <Input
                  id="create-phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="例如：0912-345-678"
                  disabled={isPending}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="create-role">系統權限角色</Label>
              <Select
                value={role}
                onValueChange={(val) => setRole(val as "admin" | "technician" | "user")}
                disabled={isPending}
              >
                <SelectTrigger id="create-role">
                  <SelectValue placeholder="請選擇角色" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                      <span>一般使用者 (User)</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="technician">
                    <div className="flex items-center gap-2">
                      <Wrench className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      <span>維修技師 (Technician)</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="admin">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                      <span>系統管理者 (Admin)</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
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
              建立帳號
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
