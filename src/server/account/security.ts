import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/database.types";
import { changePasswordSchema } from "@/server/personal-settings/input";

export type PasswordVerification = { ok: true } | { ok: false; error: string };

export interface AccountSecurityAdapter {
  verifyCurrentPassword(input: { password: string; captchaToken: string }): Promise<PasswordVerification>;
  updatePassword(password: string): Promise<{ error?: { code?: string } | null }>;
  clearPasswordChangeRequired(): Promise<{ error?: unknown }>;
}

// 這幾種錯誤使用者自己能處理，收斂成通用訊息只會讓人拿同一組密碼重試。
const PASSWORD_UPDATE_ERRORS: Record<string, string> = {
  same_password: "新密碼不可與目前密碼相同",
  weak_password: "新密碼強度不足，請改用更複雜的密碼",
};

/**
 * 變更密碼與刪除帳號都要先用目前密碼重驗身分；用非 cookie 的獨立 client，
 * 重驗證不寫入也不取代目前 session cookie。
 */
export async function verifyCurrentPassword(
  session: { email: string },
  input: { password: string; captchaToken: string },
): Promise<PasswordVerification> {
  // 空 token 打到 auth 只會拿到籠統的 invalid_credentials，先在本機擋下並說清楚原因。
  if (!input.captchaToken) {
    return { ok: false, error: "請先完成安全驗證" };
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return { ok: false, error: "伺服器設定不完整，請聯絡系統管理者" };
  }

  const { error } = await createSupabaseClient(supabaseUrl, supabaseKey).auth.signInWithPassword({
    email: session.email,
    password: input.password,
    options: { captchaToken: input.captchaToken },
  });

  if (error) {
    // captcha 失敗與密碼錯誤是兩件事，前者不該被說成「目前密碼錯誤」。
    return {
      ok: false,
      error: error.code === "captcha_failed" ? "安全驗證失敗或已過期，請重試" : "目前密碼錯誤",
    };
  }

  return { ok: true };
}

export function createSupabaseAccountSecurityAdapter(session: {
  email: string;
  userId: string;
  supabase: SupabaseClient<Database>;
  admin: SupabaseClient<Database>;
}): AccountSecurityAdapter {
  return {
    async verifyCurrentPassword(input) {
      return verifyCurrentPassword(session, input);
    },
    async updatePassword(password) {
      const { error } = await session.supabase.auth.updateUser({ password });
      if (error) {
        console.error("Failed to change own password:", error);
      }
      return { error };
    },
    async clearPasswordChangeRequired() {
      const { error } = await session.admin
        .from("profiles")
        .update({ must_change_password: false, updated_at: new Date().toISOString() })
        .eq("id", session.userId);

      if (error) {
        console.error("Failed to clear must_change_password:", error);
      }
      return { error };
    },
  };
}

export async function changePassword(
  adapter: AccountSecurityAdapter,
  input: { currentPassword: string; newPassword: string; captchaToken: string },
): Promise<{ success: boolean; error?: string }> {
  const parsed = changePasswordSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "密碼格式不正確" };
  }

  const verified = await adapter.verifyCurrentPassword({
    password: parsed.data.currentPassword,
    captchaToken: input.captchaToken,
  });

  if (!verified.ok) {
    return { success: false, error: verified.error };
  }

  const { error: updateError } = await adapter.updatePassword(parsed.data.newPassword);
  if (updateError) {
    return { success: false, error: PASSWORD_UPDATE_ERRORS[updateError.code ?? ""] ?? "密碼更新失敗，請稍後再試" };
  }

  // 旗標沒清掉時密碼已經生效；不能用 { success: true } 讓 UI 假裝準備完成。
  const { error: flagError } = await adapter.clearPasswordChangeRequired();
  if (flagError) {
    return { success: false, error: "密碼已更新，但無法完成登入準備，請重新登入後再試" };
  }

  return { success: true };
}
