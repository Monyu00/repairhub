"use server";

import { createClient } from "@/lib/supabase/server";
import { getSession } from "@/server/auth/session";
import { normalizeTurnstileError } from "@/server/turnstile";

export async function loginWithEmail(formData: { email: string; password: string; captchaToken: string }) {
  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email: formData.email,
    password: formData.password,
    options: { captchaToken: formData.captchaToken },
  });

  if (error) {
    return { success: false, error: normalizeTurnstileError(error.message, error.code) };
  }

  const session = await getSession();
  return { success: true, mustChangePassword: session?.mustChangePassword ?? false };
}

export async function registerWithEmail(formData: { email: string; password: string; captchaToken: string }) {
  if (!formData.password || formData.password.length < 8) {
    return { success: false, error: "密碼長度至少需要 8 個字元" };
  }

  const supabase = await createClient();

  const { data, error } = await supabase.auth.signUp({
    email: formData.email,
    password: formData.password,
    options: { captchaToken: formData.captchaToken },
  });

  if (error) {
    return { success: false, error: normalizeTurnstileError(error.message, error.code) };
  }

  if (!data.session) {
    return { success: true, needsEmailVerification: true, mustChangePassword: false };
  }

  const session = await getSession();
  return { success: true, needsEmailVerification: false, mustChangePassword: session?.mustChangePassword ?? false };
}

export async function getPasskeyLoginState() {
  const session = await getSession();
  return { success: Boolean(session), mustChangePassword: session?.mustChangePassword ?? false };
}
