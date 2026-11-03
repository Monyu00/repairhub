"use server";

import { createClient } from "@/lib/supabase/server";
import { getSession } from "@/server/auth/session";

export async function loginWithEmail(formData: { email: string; password: string }) {
  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email: formData.email,
    password: formData.password,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  const session = await getSession();
  return { success: true, mustChangePassword: session?.mustChangePassword ?? false };
}

export async function registerWithEmail(formData: { email: string; password: string }) {
  if (!formData.password || formData.password.length < 8) {
    return { success: false, error: "密碼長度至少需要 8 個字元" };
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.signUp({
    email: formData.email,
    password: formData.password,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  const session = await getSession();
  return { success: true, mustChangePassword: session?.mustChangePassword ?? false };
}
