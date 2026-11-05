"use server";

import { createClient } from "@/lib/supabase/server";
import { normalizeTurnstileError } from "@/server/turnstile";

export async function sendPasswordResetEmail(email: string, captchaToken: string) {
  const supabase = await createClient();

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const callbackUrl = `${siteUrl}/auth/callback?next=/reset-password`;

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: callbackUrl,
    captchaToken,
  });

  if (error) {
    return { success: false, error: normalizeTurnstileError(error.message, error.code) };
  }

  return { success: true };
}
