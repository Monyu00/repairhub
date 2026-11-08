"use client";

import { useRef, useState } from "react";

import { ShieldAlert, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { TurnstileWidget, type TurnstileWidgetHandle } from "@/components/turnstile/turnstile-widget";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { signOutAction } from "@/server/auth/actions";

import { deleteMyAccount } from "../_actions/profile-actions";

interface DeleteAccountCardProps {
  email: string;
  disabled?: boolean;
}

export function DeleteAccountCard({ email, disabled = false }: DeleteAccountCardProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [acknowledged, setAcknowledged] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const turnstileRef = useRef<TurnstileWidgetHandle | null>(null);

  // 三重確認：勾選了解不可復原、輸入電子郵件、輸入目前密碼；安全驗證由 Turnstile 把關。
  const canDelete = acknowledged && confirmEmail.trim() === email && currentPassword !== "" && Boolean(captchaToken);

  const handleDelete = async (event: React.MouseEvent) => {
    event.preventDefault();
    setLoading(true);
    setFormError(null);

    const result = await deleteMyAccount({ currentPassword, captchaToken: captchaToken ?? "" });

    if (!result.success) {
      setLoading(false);
      setFormError(result.error ?? "刪除帳號失敗，請稍後再試。");
      turnstileRef.current?.reset();
      setCaptchaToken(null);
      return;
    }

    toast.success("帳號已刪除，即將登出…");
    await signOutAction();
  };

  return (
    <Card className="border-destructive/40">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-destructive">
          <ShieldAlert className="size-4" />
          刪除帳號
        </CardTitle>
        <CardDescription>這是無法復原的操作，刪除後無法再以此帳號登入或管理任何資料。</CardDescription>
      </CardHeader>
      <CardContent>
        <Button type="button" variant="destructive" onClick={() => setOpen(true)} disabled={loading || disabled}>
          <Trash2 data-icon="inline-start" />
          刪除我的帳號
        </Button>
      </CardContent>

      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (loading) return;
          setOpen(next);
          if (!next) {
            setFormError(null);
            setAcknowledged(false);
            setConfirmEmail("");
            setCurrentPassword("");
            setCaptchaToken(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <ShieldAlert className="size-4" />
              刪除帳號
            </DialogTitle>
            <DialogDescription>需要完成以下全部確認才能刪除，刪除後無法復原。</DialogDescription>
          </DialogHeader>

          <Alert variant="destructive">
            <AlertTitle>刪除後會發生什麼事</AlertTitle>
            <AlertDescription>
              <ul className="list-disc space-y-1 pl-4">
                <li>帳號、個人資料與通知偏好會永久刪除，無法復原。</li>
                <li>你提出的報修單據與維修紀錄會留在系統中，但無法再以這個帳號查詢或管理。</li>
                <li>被指派給你的維修單據會改回未指派。</li>
                <li>訂閱的類別會一併移除。</li>
                <li>你發布的公告會保留，作者顯示為系統人員。</li>
                <li>之後需要請系統管理者重新建立帳號才能再次使用。</li>
              </ul>
            </AlertDescription>
          </Alert>

          <FieldGroup className="gap-4">
            <Field>
              <div className="flex items-start gap-2">
                <Checkbox
                  id="delete-account-ack"
                  checked={acknowledged}
                  onCheckedChange={(checked) => setAcknowledged(checked === true)}
                  disabled={loading}
                />
                <label className="cursor-pointer text-sm leading-snug" htmlFor="delete-account-ack">
                  我了解刪除帳號是永久且無法復原的操作。
                </label>
              </div>
            </Field>

            <Field>
              <FieldLabel htmlFor="delete-account-confirm-email">
                輸入你的電子郵件以確認：<span className="font-normal text-muted-foreground">{email}</span>
              </FieldLabel>
              <Input
                id="delete-account-confirm-email"
                value={confirmEmail}
                onChange={(event) => setConfirmEmail(event.target.value)}
                placeholder={email}
                autoComplete="off"
                disabled={loading}
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="delete-account-current-password">目前密碼</FieldLabel>
              <Input
                id="delete-account-current-password"
                type="password"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                disabled={loading}
              />
            </Field>
          </FieldGroup>

          <TurnstileWidget onSuccess={setCaptchaToken} onExpire={() => setCaptchaToken(null)} ref={turnstileRef} />

          {formError && (
            <Alert variant="destructive">
              <AlertTitle>刪除失敗</AlertTitle>
              <AlertDescription>{formError}</AlertDescription>
            </Alert>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={loading}>
              取消
            </Button>
            <Button type="button" variant="destructive" onClick={handleDelete} disabled={!canDelete || loading}>
              {loading ? "刪除中…" : "永久刪除帳號"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
