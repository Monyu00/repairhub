import Link from "next/link";

import { KeyRound } from "lucide-react";

import { APP_CONFIG } from "@/config/app-config";

import { ForgotPasswordForm } from "./_components/forgot-password-form";

export default function ForgotPasswordPage() {
  return (
    <div className="flex min-h-dvh flex-col justify-between bg-muted/40 p-4 md:p-8">
      <div className="mx-auto my-auto w-full max-w-md space-y-6">
        <div className="flex flex-col items-center space-y-2 text-center">
          <div className="flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <KeyRound className="size-6" />
          </div>
          <h1 className="font-bold text-2xl tracking-tight">忘記密碼</h1>
          <p className="text-muted-foreground text-sm">請輸入您註冊時使用的電子郵件，我們將寄送密碼重設連結給您</p>
        </div>

        <div className="rounded-xl border bg-card p-6 shadow-xs sm:p-8">
          <ForgotPasswordForm />
        </div>

        <div className="flex justify-center text-xs">
          <Link href="/login" className="text-muted-foreground hover:text-primary hover:underline">
            ← 返回登入頁面
          </Link>
        </div>
      </div>

      <footer className="pt-6 text-center text-muted-foreground text-xs">{APP_CONFIG.copyright}</footer>
    </div>
  );
}
