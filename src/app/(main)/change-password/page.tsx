import { redirect } from "next/navigation";

import { LockKeyhole } from "lucide-react";

import { getSession } from "@/server/auth/session";

import { ChangePasswordForm } from "./_components/change-password-form";

export default async function ChangePasswordPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }
  if (!session.mustChangePassword) {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <LockKeyhole className="size-6" />
          </div>
          <h1 className="font-bold text-2xl tracking-tight">請先變更密碼</h1>
          <p className="text-muted-foreground text-sm">為保護帳號安全，請設定新的登入密碼後再繼續。</p>
        </div>
        <div className="rounded-xl border bg-card p-6 shadow-xs sm:p-8">
          <ChangePasswordForm />
        </div>
      </div>
    </div>
  );
}
