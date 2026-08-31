"use client";

import { useEffect, useState, useTransition } from "react";

import { Check, CheckCircle2, Copy, Eye, EyeOff, KeyRound, Loader2, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

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

import { resetUserPassword, type UserItem } from "../_actions/user-actions";

interface UserResetPasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserItem | null;
}

export function UserResetPasswordDialog({ open, onOpenChange, user }: UserResetPasswordDialogProps) {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [savedPassword, setSavedPassword] = useState("");
  const [copiedPassword, setCopiedPassword] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (open) {
      setPassword("");
      setShowPassword(false);
      setError(null);
      setIsSuccess(false);
      setSavedPassword("");
      setCopiedPassword(false);
    }
  }, [open]);

  if (!user) return null;

  const handleGeneratePassword = () => {
    const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%";
    let generated = "";
    for (let i = 0; i < 12; i++) {
      generated += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(generated);
    setShowPassword(true);
  };

  const handleCopyPassword = async () => {
    try {
      await navigator.clipboard.writeText(savedPassword);
      setCopiedPassword(true);
      toast.success("已複製新密碼");
      setTimeout(() => setCopiedPassword(false), 2000);
    } catch {
      toast.error("複製失敗，請手動複製");
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!password.trim() || password.trim().length < 6) {
      setError("新密碼長度至少需為 6 個字元");
      return;
    }

    const trimmedPassword = password.trim();

    startTransition(async () => {
      const res = await resetUserPassword(user.id, trimmedPassword);

      if (res.success) {
        setSavedPassword(trimmedPassword);
        setIsSuccess(true);
        toast.success("密碼重設成功");
      } else {
        setError(res.error ?? "密碼重設失敗");
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[460px]">
        {isSuccess ? (
          <div>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-5 w-5" />
                密碼重設成功
              </DialogTitle>
              <DialogDescription>
                已成功變更 <span className="font-medium font-mono text-foreground">{user.email}</span> 的登入密碼。
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="rounded-lg border bg-muted/40 p-4">
                <div className="mb-1 font-medium text-muted-foreground text-xs">新的登入密碼</div>
                <div className="flex items-center justify-between gap-2 rounded-md border bg-background px-3 py-2 font-mono font-semibold text-primary text-sm">
                  <span className="select-all truncate">{savedPassword}</span>
                  <Button type="button" variant="ghost" size="icon-xs" onClick={handleCopyPassword} title="複製密碼">
                    {copiedPassword ? (
                      <Check className="h-3.5 w-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="flex items-start gap-2.5 rounded-md border border-amber-500/20 bg-amber-500/10 p-3 text-amber-800 text-xs dark:text-amber-300">
                <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
                <span>請複製並提供新密碼給該使用者，關閉後將無法再次檢視此明文密碼。</span>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" className="w-full" onClick={() => onOpenChange(false)}>
                完成並關閉
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <KeyRound className="h-5 w-5 text-primary" />
                重設使用者密碼
              </DialogTitle>
              <DialogDescription>
                為 <span className="font-medium font-mono text-foreground">{user.email}</span> 設定新的登入密碼。
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="reset-new-password">
                    新密碼 <span className="text-destructive">*</span>
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
                    id="reset-new-password"
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
                確認重設密碼
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
