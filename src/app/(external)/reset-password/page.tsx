import Link from "next/link";

import { LockKeyhole } from "lucide-react";

import { APP_CONFIG } from "@/config/app-config";

import { ResetPasswordForm } from "./_components/reset-password-form";

export default function ResetPasswordPage() {
  return (
    <div className="bg-muted/40 flex min-h-dvh flex-col justify-between p-4 md:p-8">
      <main className="mx-auto my-auto w-full max-w-md space-y-6">
        <div className="flex flex-col items-center space-y-2 text-center">
          <div className="bg-primary text-primary-foreground flex size-12 items-center justify-center rounded-xl shadow-sm">
            <LockKeyhole className="size-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">重設密碼</h1>
          <p className="text-muted-foreground text-sm">請輸入您的新密碼，重設完成後即可重新登入</p>
        </div>

        <div className="bg-card rounded-xl border p-6 shadow-xs sm:p-8">
          <ResetPasswordForm />
        </div>

        <div className="flex justify-center text-xs">
          <Link href="/login" className="text-muted-foreground hover:text-primary hover:underline">
            ← 返回登入頁面
          </Link>
        </div>
      </main>

      <footer className="text-muted-foreground pt-6 text-center text-xs">{APP_CONFIG.copyright}</footer>
    </div>
  );
}
