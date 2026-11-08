"use server";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import { createAdminClient } from "@/lib/supabase/admin";
import type { UserRole } from "@/lib/users/projection";
import { type AuthenticatedUser, getSession, safeAction } from "@/server/auth/session";

import type { NotificationPreferences } from "./profile-input";
import {
  canDeleteOwnAccount,
  changePasswordSchema,
  notificationPreferencesSchema,
  profileInputSchema,
  resolveNotificationPreferences,
} from "./profile-input";

export interface MyProfile {
  displayName: string | null;
  department: string | null;
  phone: string | null;
  email: string;
  avatarUrl: string | null;
  role: UserRole | null;
  isActive: boolean;
  mustChangePassword: boolean;
  preferences: NotificationPreferences;
}

export type ProfileResult = { success: boolean; error?: string };

export interface MyProfileResult {
  profile: MyProfile | null;
  loadError?: string;
}

type PasswordVerification = { ok: true } | { ok: false; error: string };

/**
 * 變更密碼與刪除帳號都要先用目前密碼重驗身分；用非 cookie 的獨立 client，
 * 重驗證不寫入也不取代目前 session cookie。
 */
async function verifyCurrentPassword(
  session: AuthenticatedUser,
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

export async function fetchMyProfile(): Promise<MyProfileResult> {
  const session = await getSession();
  if (!session) {
    return { profile: null };
  }

  const { data, error } = await session.supabase
    .from("profiles")
    .select("display_name, department, phone, notification_preferences")
    .eq("id", session.userId)
    .maybeSingle();

  if (error) {
    console.error("Failed to load own profile:", error);
    return { profile: null, loadError: "無法讀取個人資料，請稍後再試" };
  }

  return {
    profile: {
      displayName: data?.display_name ?? null,
      department: data?.department ?? null,
      phone: data?.phone ?? null,
      email: session.email,
      avatarUrl: session.avatarUrl ?? null,
      role: session.role,
      isActive: session.isActive,
      mustChangePassword: session.mustChangePassword,
      preferences: resolveNotificationPreferences(data?.notification_preferences),
    },
  };
}

export async function updateMyProfile(data: {
  displayName: string;
  department: string;
  phone: string;
}): Promise<ProfileResult> {
  return safeAction(async () => {
    const session = await getSession();
    if (!session) {
      return { success: false, error: "尚未登入，請先登入" };
    }

    const parsed = profileInputSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message ?? "個人資料格式不正確" };
    }

    // updated_at 由 trigger_update_profiles_timestamp 負責。
    const { error } = await session.supabase
      .from("profiles")
      .update({
        display_name: parsed.data.displayName,
        department: parsed.data.department || null,
        phone: parsed.data.phone || null,
      })
      .eq("id", session.userId);

    if (error) {
      console.error("Failed to update own profile:", error);
      return { success: false, error: "更新個人資料失敗，請稍後再試" };
    }

    return { success: true };
  });
}

export async function updateNotificationPreferences(data: {
  ticketStatus: boolean;
  newTicket: boolean;
}): Promise<ProfileResult> {
  return safeAction(async () => {
    const session = await getSession();
    if (!session) {
      return { success: false, error: "尚未登入，請先登入" };
    }

    const parsed = notificationPreferencesSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: "通知偏好格式不正確" };
    }

    // 全關也是合法值，兩個 key 一律寫入（ADR-0009 契約）。
    const { error } = await session.supabase
      .from("profiles")
      .update({
        notification_preferences: {
          ticket_status: parsed.data.ticketStatus,
          new_ticket: parsed.data.newTicket,
        },
      })
      .eq("id", session.userId);

    if (error) {
      console.error("Failed to update notification preferences:", error);
      return { success: false, error: "更新通知偏好失敗，請稍後再試" };
    }

    return { success: true };
  });
}

export async function changeMyPassword(data: {
  currentPassword: string;
  newPassword: string;
  captchaToken: string;
}): Promise<ProfileResult> {
  return safeAction(async () => {
    const session = await getSession();
    if (!session) {
      return { success: false, error: "尚未登入，請先登入" };
    }

    const parsed = changePasswordSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message ?? "密碼格式不正確" };
    }

    const verified = await verifyCurrentPassword(session, {
      password: parsed.data.currentPassword,
      captchaToken: data.captchaToken,
    });

    if (!verified.ok) {
      return { success: false, error: verified.error };
    }

    const { error: updateError } = await session.supabase.auth.updateUser({
      password: parsed.data.newPassword,
    });

    if (updateError) {
      console.error("Failed to change own password:", updateError);
      return { success: false, error: "密碼更新失敗，請稍後再試" };
    }

    // 旗標只在 /change-password 清過；這裡一併清掉，否則帳號仍會被導回變更密碼頁。
    const { error: flagError } = await createAdminClient()
      .from("profiles")
      .update({ must_change_password: false, updated_at: new Date().toISOString() })
      .eq("id", session.userId);

    if (flagError) {
      console.error("Failed to clear must_change_password:", flagError);
      return { success: false, error: "密碼已更新，但無法完成登入準備，請重新登入後再試" };
    }

    return { success: true };
  });
}

export async function deleteMyAccount(data: { currentPassword: string; captchaToken: string }): Promise<ProfileResult> {
  return safeAction(async () => {
    const session = await getSession();
    if (!session) {
      return { success: false, error: "尚未登入，請先登入" };
    }

    const verified = await verifyCurrentPassword(session, {
      password: data.currentPassword,
      captchaToken: data.captchaToken,
    });

    if (!verified.ok) {
      return { success: false, error: verified.error };
    }

    const admin = createAdminClient();

    if (session.role === "admin") {
      const { count } = await admin
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("user_role", "admin")
        .eq("is_active", true);

      if (!canDeleteOwnAccount({ role: session.role, activeAdminCount: count ?? 0 })) {
        return { success: false, error: "系統需要至少一位系統管理者，請先指派新的系統管理者再刪除帳號" };
      }
    }

    // 刪除 auth user 會連帶刪除 profiles（ON DELETE CASCADE），已指派的單據改為未指派，
    // 已提出的單據與其紀錄留在系統中，但無法再以這個帳號查詢或管理。
    const { error: deleteError } = await admin.auth.admin.deleteUser(session.userId);

    if (deleteError) {
      console.error("Failed to delete own account:", deleteError);
      return { success: false, error: "刪除帳號失敗，請稍後再試或聯絡系統管理者" };
    }

    return { success: true };
  });
}
