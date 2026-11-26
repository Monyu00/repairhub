import { AlertCircle, Wrench } from "lucide-react";

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
    <div className="px-4 py-8 sm:py-12">
      <div className="mx-auto w-full max-w-md space-y-6">
        <div className="flex flex-col items-center space-y-2 text-center">
          <div className="bg-primary text-primary-foreground flex size-12 items-center justify-center rounded-xl shadow-sm">
            <Wrench className="size-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">登入南臺校園維修通報系統</h1>
          <p className="text-muted-foreground text-sm">請輸入您的帳號密碼登入</p>
        </div>

        {error === "auth-callback-failed" && (
          <div className="border-destructive/20 bg-destructive/10 text-foreground flex items-center gap-2 rounded-lg border p-3 text-sm">
            <AlertCircle className="text-destructive size-4 shrink-0" />
            <span>登入驗證失敗或已過期，請重新嘗試。</span>
          </div>
        )}

        <div className="bg-card rounded-xl border p-6 shadow-xs sm:p-8">
          <LoginForm redirectTo={redirectTo} />
        </div>
      </div>
    </div>
  );
}
