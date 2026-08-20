"use server";

import { createClient } from "@/lib/supabase/server";

export async function updatePassword(password: string) {
  if (!password || password.length < 8) {
    return { success: false, error: "密碼長度至少需要 8 個字元" };
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.updateUser({
    password: password,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}
