import Link from "next/link";

import { Wrench } from "lucide-react";

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

  return (
    <div className="flex min-h-dvh flex-col justify-center bg-muted/40 p-4 md:p-8">
      <div className="mx-auto w-full max-w-md space-y-6">
        <div className="flex flex-col items-center space-y-2 text-center">
          <div className="flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <Wrench className="size-6" />
          </div>
          <h1 className="font-bold text-2xl tracking-tight">登入 RepairHub 報修管理系統</h1>
          <p className="text-muted-foreground text-sm">請輸入您的帳號密碼，或使用 Google 帳號快速登入</p>
        </div>

        <div className="rounded-xl border bg-card p-6 shadow-xs sm:p-8">
          <div className="space-y-4">
            <GoogleLoginButton className="w-full" redirectTo={redirectTo} />
            <div className="relative text-center text-xs after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t after:border-border">
              <span className="relative z-10 bg-card px-2 text-muted-foreground">或使用 Email 登入</span>
            </div>
            <LoginForm redirectTo={redirectTo} />
          </div>
        </div>

        <div className="flex justify-between px-2 text-xs text-muted-foreground">
          <Link href="/report" className="hover:underline">
            ← 我要報修 (免登入)
          </Link>
          <Link href="/track" className="hover:underline">
            追蹤報修單 →
          </Link>
        </div>
      </div>
    </div>
  );
}
