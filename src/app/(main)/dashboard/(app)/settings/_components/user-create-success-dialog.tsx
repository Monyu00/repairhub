"use client";

import { useState } from "react";

import { Check, CheckCircle2, Copy, ShieldAlert } from "lucide-react";
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

interface UserCreateSuccessDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  email: string;
  password: string;
}

export function UserCreateSuccessDialog({ open, onOpenChange, email, password }: UserCreateSuccessDialogProps) {
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [copiedPassword, setCopiedPassword] = useState(false);

  const handleCopyEmail = async () => {
    try {
      await navigator.clipboard.writeText(email);
      setCopiedEmail(true);
      toast.success("已複製 Email");
      setTimeout(() => setCopiedEmail(false), 2000);
    } catch {
      toast.error("複製失敗，請手動複製");
    }
  };

  const handleCopyPassword = async () => {
    try {
      await navigator.clipboard.writeText(password);
      setCopiedPassword(true);
      toast.success("已複製密碼");
      setTimeout(() => setCopiedPassword(false), 2000);
    } catch {
      toast.error("複製失敗，請手動複製");
    }
  };

  const handleCopyAll = async () => {
    try {
      const text = `帳號：${email}\n密碼：${password}`;
      await navigator.clipboard.writeText(text);
      toast.success("已複製帳號與密碼");
    } catch {
      toast.error("複製失敗，請手動複製");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle className="text-success-text flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5" />
            使用者帳號建立成功
          </DialogTitle>
          <DialogDescription>帳號已成功建立。請將下列登入資訊妥善儲存並提供給該使用者。</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-3">
          <div className="bg-muted/40 space-y-3 rounded-lg border p-4">
            <div>
              <div className="text-muted-foreground mb-1 text-xs font-medium">登入帳號 (Email)</div>
              <div className="bg-background flex items-center justify-between gap-2 rounded-md border px-3 py-2 font-mono text-sm">
                <span className="truncate select-all">{email}</span>
                <Button type="button" variant="ghost" size="icon-xs" onClick={handleCopyEmail} title="複製 Email">
                  {copiedEmail ? <Check className="text-success-text h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                </Button>
              </div>
            </div>

            <div>
              <div className="text-muted-foreground mb-1 text-xs font-medium">初始登入密碼</div>
              <div className="bg-background text-primary flex items-center justify-between gap-2 rounded-md border px-3 py-2 font-mono text-sm font-semibold">
                <span className="truncate select-all">{password}</span>
                <Button type="button" variant="ghost" size="icon-xs" onClick={handleCopyPassword} title="複製密碼">
                  {copiedPassword ? (
                    <Check className="text-success-text h-3.5 w-3.5" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </Button>
              </div>
            </div>
          </div>

          <div className="border-warning/20 bg-warning/10 text-warning-text flex items-start gap-2.5 rounded-md border p-3 text-xs">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              <strong>重要提示：</strong>
              此密碼僅會在此處顯示一次。關閉此視窗後系統基於安全原則將無法再次讀取純文字密碼。
            </span>
          </div>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={handleCopyAll}>
            <Copy className="mr-1.5 h-4 w-4" />
            複製完整帳密
          </Button>
          <Button type="button" className="w-full sm:w-auto" onClick={() => onOpenChange(false)}>
            完成並關閉
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
