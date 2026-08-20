import Link from "next/link";

import { AlertCircle, Wrench } from "lucide-react";

import { APP_CONFIG } from "@/config/app-config";

import { GoogleLoginButton } from "./_components/google-login-button";
import { LoginForm } from "./_components/login-form";

interface LoginPageProps {
  searchParams: Promise<{
    redirectTo?: string;
    error?: string;
  }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const redirectTo = params.redirectTo;
  const error = params.error;

  return (
    <div className="flex min-h-dvh flex-col justify-between bg-muted/40 p-4 md:p-8">
      <div className="mx-auto my-auto w-full max-w-md space-y-6">
        <div className="flex flex-col items-center space-y-2 text-center">
          <div className="flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <Wrench className="size-6" />
          </div>
          <h1 className="font-bold text-2xl tracking-tight">登入 RepairHub 報修管理系統</h1>
          <p className="text-muted-foreground text-sm">請輸入您的帳號密碼，或使用 Google 帳號快速登入</p>
        </div>

        {error === "invalid-domain" && (
          <div className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-destructive text-sm">
            <AlertCircle className="size-4 shrink-0" />
            <span>僅限使用 @stust.edu.tw 學校信箱登入，請切換帳號。</span>
          </div>
        )}

        {error === "auth-callback-failed" && (
          <div className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-destructive text-sm">
            <AlertCircle className="size-4 shrink-0" />
            <span>登入驗證失敗或已過期，請重新嘗試。</span>
          </div>
        )}

        <div className="rounded-xl border bg-card p-6 shadow-xs sm:p-8">
          <div className="space-y-4">
            <GoogleLoginButton className="w-full" redirectTo={redirectTo} />
            <div className="relative text-center text-xs after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-border after:border-t">
              <span className="relative z-10 bg-card px-2 text-muted-foreground">或使用 Email 登入</span>
            </div>
            <LoginForm redirectTo={redirectTo} />
          </div>
        </div>

        <div className="flex justify-between px-2 text-muted-foreground text-xs">
          <Link href="/report" className="hover:underline">
            ← 我要報修 (免登入)
          </Link>
          <Link href="/track" className="hover:underline">
            追蹤報修單 →
          </Link>
        </div>
      </div>

      <footer className="pt-6 text-center text-muted-foreground text-xs">{APP_CONFIG.copyright}</footer>
    </div>
  );
}
