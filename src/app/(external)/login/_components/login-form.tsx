"use client";

import { useState } from "react";

import { useRouter } from "next/navigation";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

import { loginWithEmail, registerWithEmail } from "../_actions/actions";

const loginSchema = z.object({
  email: z.string().email({ message: "請輸入有效的 Email 地址。" }),
  password: z.string().min(6, { message: "密碼至少需要 6 個字元。" }),
});

const registerSchema = z
  .object({
    email: z.string().email({ message: "請輸入有效的 Email 地址。" }),
    password: z.string().min(6, { message: "密碼至少需要 6 個字元。" }),
    confirmPassword: z.string().min(6, { message: "確認密碼至少需要 6 個字元。" }),
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
    setLoading(true);
    const res = await loginWithEmail(data);
    if (!res.success) {
      toast.error("登入失敗", { description: res.error });
      setLoading(false);
      return;
    }

    toast.success("登入成功！");
    router.push(redirectTo ?? "/dashboard");
    router.refresh();
  }

  async function onRegisterSubmit(data: z.infer<typeof registerSchema>) {
    setLoading(true);
    const res = await registerWithEmail({ email: data.email, password: data.password });
    if (!res.success) {
      toast.error("註冊失敗", { description: res.error });
      setLoading(false);
      return;
    }

    toast.success("註冊成功！已自動登入。");
    router.push(redirectTo ?? "/dashboard");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {mode === "login" ? (
        <form key="login-form" noValidate onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="flex flex-col gap-4">
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
                    placeholder="you@example.com"
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
                  <FieldLabel htmlFor="login-password">密碼</FieldLabel>
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
          <Button className="w-full" type="submit" disabled={loading}>
            {loading ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
            登入
          </Button>
        </form>
      ) : (
        <form key="register-form" noValidate onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="flex flex-col gap-4">
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
                    placeholder="you@example.com"
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
                  <FieldLabel htmlFor="register-password">密碼</FieldLabel>
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
          <Button className="w-full" type="submit" disabled={loading}>
            {loading ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
            註冊帳號
          </Button>
        </form>
      )}

      <div className="text-center text-sm text-muted-foreground">
        {mode === "login" ? (
          <>
            還沒有帳號嗎？{" "}
            <button
              type="button"
              onClick={() => setMode("register")}
              className="font-medium text-primary underline underline-offset-4 hover:text-primary/80"
            >
              立即註冊
            </button>
          </>
        ) : (
          <>
            已有帳號？{" "}
            <button
              type="button"
              onClick={() => setMode("login")}
              className="font-medium text-primary underline underline-offset-4 hover:text-primary/80"
            >
              登入帳號
            </button>
          </>
        )}
      </div>
    </div>
  );
}
