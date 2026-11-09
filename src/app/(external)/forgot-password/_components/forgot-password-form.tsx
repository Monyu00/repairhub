"use client";

import { useRef, useState } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, Loader2, Mail } from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { TurnstileWidget, type TurnstileWidgetHandle } from "@/components/turnstile/turnstile-widget";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { TURNSTILE_ERROR_MESSAGE } from "@/lib/turnstile";

import { sendPasswordResetEmail } from "../_actions/actions";

const forgotPasswordSchema = z.object({
  email: z.string().email({ message: "請輸入有效的 Email 地址。" }),
});

export function ForgotPasswordForm() {
  const [loading, setLoading] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const turnstileRef = useRef<TurnstileWidgetHandle | null>(null);

  const form = useForm<z.infer<typeof forgotPasswordSchema>>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  async function onSubmit(data: z.infer<typeof forgotPasswordSchema>) {
    if (!captchaToken) {
      toast.error("發送重設信失敗", { description: TURNSTILE_ERROR_MESSAGE });
      return;
    }

    setLoading(true);
    try {
      const res = await sendPasswordResetEmail(data.email, captchaToken);
      if (!res.success) {
        toast.error("發送重設信失敗", { description: res.error });
        return;
      }

      setSubmittedEmail(data.email);
      toast.success("密碼重設信已寄出！");
    } catch {
      toast.error("發送重設信失敗", { description: "目前無法處理您的請求，請稍後再試" });
    } finally {
      setCaptchaToken(null);
      turnstileRef.current?.reset();
      setLoading(false);
    }
  }

  if (submittedEmail) {
    return (
      <div className="space-y-4 text-center">
        <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-success/10 text-success-text dark:bg-success/20 ">
          <CheckCircle2 className="size-6" />
        </div>
        <div className="space-y-1">
          <h3 className="font-semibold text-base">重設信件已寄出</h3>
          <p className="text-muted-foreground text-sm">
            我們已將密碼重設連結發送至 <span className="font-medium text-foreground">{submittedEmail}</span>
            ，請前往您的信箱查看並點擊連結重設密碼。
          </p>
        </div>
        <div className="pt-2">
          <Button
            variant="outline"
            className="w-full"
            onClick={() => {
              setSubmittedEmail(null);
              form.reset();
            }}
          >
            使用其他信箱重試
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form noValidate onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <FieldGroup className="gap-4">
        <Controller
          control={form.control}
          name="email"
          render={({ field, fieldState }) => (
            <Field className="gap-1.5" data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="forgot-email">電子郵件</FieldLabel>
              <Input
                {...field}
                value={field.value ?? ""}
                id="forgot-email"
                type="email"
                autoComplete="email"
                aria-invalid={fieldState.invalid}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
      </FieldGroup>
      <TurnstileWidget ref={turnstileRef} onSuccess={setCaptchaToken} onExpire={() => setCaptchaToken(null)} />
      <Button className="w-full" type="submit" disabled={loading || !captchaToken}>
        {loading ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Mail className="mr-2 size-4" />}
        寄送密碼重設信
      </Button>
    </form>
  );
}
