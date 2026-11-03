"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { getSession } from "@/server/auth/session";

export async function changeRequiredPassword(password: string) {
  const session = await getSession();
  if (!session) {
    return { success: false, error: "尚未登入，請先登入" };
  }
  if (!session.mustChangePassword) {
    return { success: false, error: "此帳號不需要變更密碼" };
  }
  if (!password || password.length < 8) {
    return { success: false, error: "新密碼長度至少需要 8 個字元" };
  }

  const { error } = await session.supabase.auth.updateUser({ password });
  if (error) {
    return { success: false, error: error.message };
  }

  const { error: profileError } = await createAdminClient()
    .from("profiles")
    .update({ must_change_password: false, updated_at: new Date().toISOString() })
    .eq("id", session.userId);

  if (profileError) {
    return { success: false, error: "密碼已更新，但無法完成登入準備，請重新登入後再試" };
  }

  return { success: true };
}
