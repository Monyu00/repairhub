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
    <div className="bg-muted/40 flex min-h-dvh items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="bg-primary text-primary-foreground flex size-12 items-center justify-center rounded-xl shadow-sm">
            <LockKeyhole className="size-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">請先變更密碼</h1>
          <p className="text-muted-foreground text-sm">為保護帳號安全，請設定新的登入密碼後再繼續。</p>
        </div>
        <div className="bg-card rounded-xl border p-6 shadow-xs sm:p-8">
          <ChangePasswordForm />
        </div>
      </div>
    </div>
  );
}
