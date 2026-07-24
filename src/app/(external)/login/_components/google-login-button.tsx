"use client";

import { useState } from "react";

import { Loader2 } from "lucide-react";
import { siGoogle } from "simple-icons";
import { toast } from "sonner";

import { SimpleIcon } from "@/components/simple-icon";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { getGoogleOAuthUrl } from "../_actions/actions";

interface GoogleLoginButtonProps extends React.ComponentProps<typeof Button> {
  redirectTo?: string;
}

export function GoogleLoginButton({ className, redirectTo, ...props }: GoogleLoginButtonProps) {
  const [loading, setLoading] = useState(false);

  async function handleGoogleLogin() {
    try {
      setLoading(true);
      const result = await getGoogleOAuthUrl(redirectTo);
      if (!result.success || !result.url) {
        toast.error("Google 登入失敗", {
          description: result.error,
        });
        setLoading(false);
        return;
      }
      window.location.href = result.url;
    } catch {
      toast.error("發生未預期的錯誤");
      setLoading(false);
    }
  }

  return (
    <Button
      variant="outline"
      type="button"
      disabled={loading}
      onClick={handleGoogleLogin}
      className={cn(className)}
      {...props}
    >
      {loading ? <Loader2 className="size-4 animate-spin" /> : <SimpleIcon icon={siGoogle} className="size-4" />}
      使用 Google 帳號登入
    </Button>
  );
}
