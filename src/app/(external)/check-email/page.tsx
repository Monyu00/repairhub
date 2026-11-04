import Link from "next/link";

import { Mail } from "lucide-react";

import { APP_CONFIG } from "@/config/app-config";

export default function CheckEmailPage() {
  return (
    <div className="flex min-h-dvh flex-col justify-between bg-muted/40 p-4 md:p-8">
      <div className="mx-auto my-auto w-full max-w-md space-y-6">
        <div className="flex flex-col items-center space-y-2 text-center">
          <div className="flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <Mail className="size-6" />
          </div>
          <h1 className="font-bold text-2xl tracking-tight">請查收驗證信</h1>
          <p className="text-muted-foreground text-sm">
            註冊成功！請前往您的 Email 收取驗證信，點擊連結完成帳號驗證後即可登入
          </p>
        </div>

        <div className="rounded-xl border bg-card p-6 text-center shadow-xs sm:p-8">
          <p className="text-muted-foreground text-sm">沒有收到信嗎？請檢查垃圾郵件資料夾，或稍後重新註冊</p>
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
