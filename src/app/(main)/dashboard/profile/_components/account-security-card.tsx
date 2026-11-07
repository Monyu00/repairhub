"use client";

import { useRef, useState } from "react";

import Link from "next/link";

import { zodResolver } from "@hookform/resolvers/zod";
import { KeyRound, Loader2, Lock } from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import type { z } from "zod";

import { TurnstileWidget, type TurnstileWidgetHandle } from "@/components/turnstile/turnstile-widget";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

import { changeMyPassword } from "../_actions/profile-actions";
import { changePasswordFormSchema } from "../_actions/profile-input";

interface AccountSecurityCardProps {
  mustChangePassword: boolean;
}

export function AccountSecurityCard({ mustChangePassword }: AccountSecurityCardProps) {
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const turnstileRef = useRef<TurnstileWidgetHandle | null>(null);

  const form = useForm<z.infer<typeof changePasswordFormSchema>>({
    resolver: zodResolver(changePasswordFormSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });

  async function onSubmit(data: z.infer<typeof changePasswordFormSchema>) {
    setLoading(true);
    setFormError(null);

    const result = await changeMyPassword({
      currentPassword: data.currentPassword,
      newPassword: data.newPassword,
      captchaToken: captchaToken ?? "",
    });
    setLoading(false);

    if (!result.success) {
      setFormError(result.error ?? "密碼變更失敗，請稍後再試。");
      turnstileRef.current?.reset();
      setCaptchaToken(null);
      return;
    }

    form.reset();
    toast.success("密碼變更成功，請使用新密碼繼續登入。");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <KeyRound className="size-4 text-primary" />
          帳號安全
        </CardTitle>
        <CardDescription>變更密碼時需要先驗證目前密碼，其裝置的登入狀態不受影響。</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {mustChangePassword && (
          <Alert>
            <AlertTitle>帳號需要變更密碼</AlertTitle>
            <AlertDescription>
              此帳號必須先變更密碼，請前往{" "}
              <Link className="font-medium underline underline-offset-4 hover:text-primary" href="/change-password">
                變更密碼
              </Link>{" "}
              頁面完成。
            </AlertDescription>
          </Alert>
        )}

        {formError && (
          <Alert variant="destructive">
            <AlertTitle>密碼變更失敗</AlertTitle>
            <AlertDescription>{formError}</AlertDescription>
          </Alert>
        )}

        <form noValidate className="flex flex-col gap-4" onSubmit={form.handleSubmit(onSubmit)}>
          <FieldGroup className="gap-4">
            <Controller
              control={form.control}
              name="currentPassword"
              render={({ field, fieldState }) => (
                <Field className="gap-1.5" data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="current-password">目前密碼</FieldLabel>
                  <Input
                    {...field}
                    value={field.value ?? ""}
                    id="current-password"
                    type="password"
                    placeholder="••••••••"
                    autoComplete="current-password"
                    disabled={loading}
                    aria-invalid={fieldState.invalid}
                  />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
            <Controller
              control={form.control}
              name="newPassword"
              render={({ field, fieldState }) => (
                <Field className="gap-1.5" data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="new-password">新密碼（至少 8 字元）</FieldLabel>
                  <Input
                    {...field}
                    value={field.value ?? ""}
                    id="new-password"
                    type="password"
                    placeholder="••••••••"
                    autoComplete="new-password"
                    disabled={loading}
                    aria-invalid={fieldState.invalid}
                  />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
            <Controller
              control={form.control}
              name="confirmPassword"
              render={({ field, fieldState }) => (
                <Field className="gap-1.5" data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="confirm-password">確認新密碼</FieldLabel>
                  <Input
                    {...field}
                    value={field.value ?? ""}
                    id="confirm-password"
                    type="password"
                    placeholder="••••••••"
                    autoComplete="new-password"
                    disabled={loading}
                    aria-invalid={fieldState.invalid}
                  />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
          </FieldGroup>

          <TurnstileWidget ref={turnstileRef} onSuccess={setCaptchaToken} onExpire={() => setCaptchaToken(null)} />

          <div className="flex justify-end">
            <Button type="submit" disabled={loading || !captchaToken}>
              {loading ? (
                <Loader2 data-icon="inline-start" className="animate-spin" />
              ) : (
                <Lock data-icon="inline-start" />
              )}
              變更密碼
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
