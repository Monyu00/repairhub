import Link from "next/link";

import { Mail } from "lucide-react";

import { APP_CONFIG } from "@/config/app-config";

export default function CheckEmailPage() {
  return (
    <div className="bg-muted/40 flex min-h-dvh flex-col justify-between p-4 md:p-8">
      <main className="mx-auto my-auto w-full max-w-md space-y-6">
        <div className="flex flex-col items-center space-y-2 text-center">
          <div className="bg-primary text-primary-foreground flex size-12 items-center justify-center rounded-xl shadow-sm">
            <Mail className="size-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">請查收驗證信</h1>
          <p className="text-muted-foreground text-sm">
            註冊成功！請前往您的 Email 收取驗證信，點擊連結完成帳號驗證後即可登入
          </p>
        </div>

        <div className="bg-card rounded-xl border p-6 text-center shadow-xs sm:p-8">
          <p className="text-muted-foreground text-sm">沒有收到信嗎？請檢查垃圾郵件資料夾，或稍後重新註冊</p>
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
