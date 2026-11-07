"use server";

import { revalidatePath } from "next/cache";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import { createAdminClient } from "@/lib/supabase/admin";
import type { UserRole } from "@/lib/users/projection";
import { getSession, safeAction } from "@/server/auth/session";

import type { NotificationPreferences } from "./profile-input";
import {
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

const PROFILE_PATH = "/dashboard/profile";

export interface MyProfileResult {
  profile: MyProfile | null;
  loadError?: string;
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

    revalidatePath(PROFILE_PATH);
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
      return { success: false, error: "通知設定格式不正確" };
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
      return { success: false, error: "更新通知設定失敗，請稍後再試" };
    }

    revalidatePath(PROFILE_PATH);
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

    // 空 token 打到 auth 只會拿到籠統的 invalid_credentials，先在本機擋下並說清楚原因。
    if (!data.captchaToken) {
      return { success: false, error: "請先完成安全驗證" };
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return { success: false, error: "伺服器設定不完整，請聯絡系統管理者" };
    }

    // 非 cookie 的獨立 client：重驗證不寫入也不取代目前 session cookie。
    const verifyClient = createSupabaseClient(supabaseUrl, supabaseKey);
    const { error: verifyError } = await verifyClient.auth.signInWithPassword({
      email: session.email,
      password: parsed.data.currentPassword,
      options: { captchaToken: data.captchaToken },
    });

    if (verifyError) {
      // captcha 失敗與密碼錯誤是兩件事，前者不該被說成「目前密碼錯誤」。
      return {
        success: false,
        error: verifyError.code === "captcha_failed" ? "安全驗證失敗或已過期，請重試" : "目前密碼錯誤",
      };
    }

    const { error: updateError } = await session.supabase.auth.updateUser({
      password: parsed.data.newPassword,
    });

    if (updateError) {
      console.error("Failed to change own password:", updateError);
      return { success: false, error: updateError.message };
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
