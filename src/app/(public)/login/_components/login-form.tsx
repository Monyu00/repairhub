"use client";

import { useRef, useState } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { zodResolver } from "@hookform/resolvers/zod";
import { Fingerprint, Loader2 } from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { TurnstileWidget, type TurnstileWidgetHandle } from "@/components/turnstile/turnstile-widget";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { describePasskeyError } from "@/lib/supabase/passkey-errors";
import { TURNSTILE_ERROR_MESSAGE } from "@/lib/turnstile";

import { getPasskeyLoginState, loginWithEmail, registerWithEmail } from "../_actions/actions";

const loginSchema = z.object({
  email: z.string().email({ message: "請輸入有效的 Email 地址。" }),
  password: z.string().min(6, { message: "密碼至少需要 6 個字元。" }),
});

const registerSchema = z
  .object({
    email: z.string().email({ message: "請輸入有效的 Email 地址。" }),
    password: z.string().min(8, { message: "密碼至少需要 8 個字元。" }),
    confirmPassword: z.string().min(8, { message: "確認密碼至少需要 8 個字元。" }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "兩次輸入的密碼不一致。",
    path: ["confirmPassword"],
  });

type FormMode = "login" | "register";

interface LoginFormProps {
  redirectTo?: string;
}

export function LoginForm({ redirectTo }: LoginFormProps) {
  const router = useRouter();
  const [mode, setMode] = useState<FormMode>("login");
  const [loading, setLoading] = useState(false);
  const [passkeyLoading, setPasskeyLoading] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const turnstileRef = useRef<TurnstileWidgetHandle | null>(null);

  const loginForm = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const registerForm = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  async function onLoginSubmit(data: z.infer<typeof loginSchema>) {
    if (!captchaToken) {
      toast.error("登入失敗", { description: TURNSTILE_ERROR_MESSAGE });
      return;
    }

    setLoading(true);
    try {
      const res = await loginWithEmail({ ...data, captchaToken });
      if (!res.success) {
        toast.error("登入失敗", { description: res.error });
        return;
      }

      toast.success("登入成功！");
      const destination = res.mustChangePassword ? "/change-password" : (redirectTo ?? "/dashboard");
      router.push(destination);
      router.refresh();
    } catch {
      toast.error("登入失敗", { description: "目前無法處理您的請求，請稍後再試" });
    } finally {
      setCaptchaToken(null);
      turnstileRef.current?.reset();
      setLoading(false);
    }
  }

  async function onRegisterSubmit(data: z.infer<typeof registerSchema>) {
    if (!captchaToken) {
      toast.error("註冊失敗", { description: TURNSTILE_ERROR_MESSAGE });
      return;
    }

    setLoading(true);
    try {
      const res = await registerWithEmail({ email: data.email, password: data.password, captchaToken });
      if (!res.success) {
        toast.error("註冊失敗", { description: res.error });
        return;
      }

      if (res.needsEmailVerification) {
        toast.success("註冊成功！請前往 Email 收取驗證信。");
        router.push("/check-email");
        return;
      }

      toast.success("註冊成功！");
      const destination = res.mustChangePassword ? "/change-password" : (redirectTo ?? "/dashboard");
      router.push(destination);
      router.refresh();
    } catch {
      toast.error("註冊失敗", { description: "目前無法處理您的請求，請稍後再試" });
    } finally {
      setCaptchaToken(null);
      turnstileRef.current?.reset();
      setLoading(false);
    }
  }

  async function onPasskeyLogin() {
    if (!captchaToken) {
      toast.error("登入失敗", { description: TURNSTILE_ERROR_MESSAGE });
      return;
    }

    setPasskeyLoading(true);
    try {
      const { error } = await createClient().auth.signInWithPasskey({ options: { captchaToken } });
      if (error) {
        toast.error("登入失敗", { description: describePasskeyError(error) });
        return;
      }

      const sessionState = await getPasskeyLoginState();
      if (!sessionState.success) {
        toast.error("登入失敗", { description: "無法確認登入狀態，請重新嘗試。" });
        return;
      }

      toast.success("登入成功！");
      const destination = sessionState.mustChangePassword ? "/change-password" : (redirectTo ?? "/dashboard");
      router.push(destination);
      router.refresh();
    } catch {
      toast.error("登入失敗", { description: "目前無法處理您的請求，請稍後再試" });
    } finally {
      setCaptchaToken(null);
      turnstileRef.current?.reset();
      setPasskeyLoading(false);
    }
  }

  function switchMode(nextMode: FormMode) {
    setCaptchaToken(null);
    turnstileRef.current?.reset();
    setMode(nextMode);
  }

  return (
    <div className="space-y-4">
      {mode === "login" ? (
        <form
          key="login-form"
          noValidate
          onSubmit={loginForm.handleSubmit(onLoginSubmit)}
          className="flex flex-col gap-4"
        >
          <FieldGroup className="gap-4">
            <Controller
              control={loginForm.control}
              name="email"
              render={({ field, fieldState }) => (
                <Field className="gap-1.5" data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="login-email">電子郵件</FieldLabel>
                  <Input
                    {...field}
                    value={field.value ?? ""}
                    id="login-email"
                    type="email"
                    autoComplete="email"
                    aria-invalid={fieldState.invalid}
                  />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
            <Controller
              control={loginForm.control}
              name="password"
              render={({ field, fieldState }) => (
                <Field className="gap-1.5" data-invalid={fieldState.invalid}>
                  <div className="flex items-center justify-between">
                    <FieldLabel htmlFor="login-password">密碼</FieldLabel>
                    <Link
                      href="/forgot-password"
                      className="text-muted-foreground hover:text-primary text-xs hover:underline"
                    >
                      忘記密碼？
                    </Link>
                  </div>
                  <Input
                    {...field}
                    value={field.value ?? ""}
                    id="login-password"
                    type="password"
                    placeholder="••••••••"
                    autoComplete="current-password"
                    aria-invalid={fieldState.invalid}
                  />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
          </FieldGroup>
          <TurnstileWidget
            key={mode}
            ref={turnstileRef}
            onSuccess={setCaptchaToken}
            onExpire={() => setCaptchaToken(null)}
          />
          <Button className="w-full" type="submit" disabled={loading || !captchaToken}>
            {loading ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
            登入
          </Button>
          <Button
            className="w-full"
            type="button"
            variant="outline"
            disabled={passkeyLoading || !captchaToken}
            onClick={onPasskeyLogin}
          >
            {passkeyLoading ? <Loader2 data-icon="inline-start" className="animate-spin" /> : <Fingerprint />}
            使用 Passkey 登入
          </Button>
        </form>
      ) : (
        <form
          key="register-form"
          noValidate
          onSubmit={registerForm.handleSubmit(onRegisterSubmit)}
          className="flex flex-col gap-4"
        >
          <FieldGroup className="gap-4">
            <Controller
              control={registerForm.control}
              name="email"
              render={({ field, fieldState }) => (
                <Field className="gap-1.5" data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="register-email">電子郵件</FieldLabel>
                  <Input
                    {...field}
                    value={field.value ?? ""}
                    id="register-email"
                    type="email"
                    autoComplete="email"
                    aria-invalid={fieldState.invalid}
                  />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
            <Controller
              control={registerForm.control}
              name="password"
              render={({ field, fieldState }) => (
                <Field className="gap-1.5" data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="register-password">密碼（至少 8 字元）</FieldLabel>
                  <Input
                    {...field}
                    value={field.value ?? ""}
                    id="register-password"
                    type="password"
                    placeholder="••••••••"
                    autoComplete="new-password"
                    aria-invalid={fieldState.invalid}
                  />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
            <Controller
              control={registerForm.control}
              name="confirmPassword"
              render={({ field, fieldState }) => (
                <Field className="gap-1.5" data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="register-confirm-password">確認密碼</FieldLabel>
                  <Input
                    {...field}
                    value={field.value ?? ""}
                    id="register-confirm-password"
                    type="password"
                    placeholder="••••••••"
                    autoComplete="new-password"
                    aria-invalid={fieldState.invalid}
                  />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
          </FieldGroup>
          <TurnstileWidget
            key={mode}
            ref={turnstileRef}
            onSuccess={setCaptchaToken}
            onExpire={() => setCaptchaToken(null)}
          />
          <Button className="w-full" type="submit" disabled={loading || !captchaToken}>
            {loading ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
            註冊帳號
          </Button>
        </form>
      )}

      <div className="text-muted-foreground text-center text-sm">
        {mode === "login" ? (
          <>
            還沒有帳號嗎？{" "}
            <button
              type="button"
              onClick={() => switchMode("register")}
              className="text-primary hover:text-primary/80 font-medium underline underline-offset-4"
            >
              立即註冊
            </button>
          </>
        ) : (
          <>
            已有帳號？{" "}
            <button
              type="button"
              onClick={() => switchMode("login")}
              className="text-primary hover:text-primary/80 font-medium underline underline-offset-4"
            >
              登入帳號
            </button>
          </>
        )}
      </div>
    </div>
  );
}
