"use server";

import { isAllowedEmailDomain } from "@/lib/auth/validate-email-domain";
import { createClient } from "@/lib/supabase/server";

export async function sendPasswordResetEmail(email: string) {
  if (!isAllowedEmailDomain(email)) {
    return { success: false, error: "僅限使用 @stust.edu.tw 學校信箱" };
  }

  const supabase = await createClient();

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const callbackUrl = `${siteUrl}/auth/callback?next=/reset-password`;

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: callbackUrl,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}
