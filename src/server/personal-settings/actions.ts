"use server";

import { removeStoredAvatar, uploadAvatar } from "@/lib/storage/avatar";
import { createAdminClient } from "@/lib/supabase/admin";
import type { UserRole } from "@/lib/users/projection";
import { changePassword, createSupabaseAccountSecurityAdapter, verifyCurrentPassword } from "@/server/account/security";
import { type AuthenticatedUser, getSession, safeAction } from "@/server/auth/session";

import type { NotificationPreferences } from "./input";
import { avatarInputSchema, canDeleteOwnAccount, notificationPreferencesSchema, profileInputSchema } from "./input";

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
export type AvatarResult = { success: boolean; error?: string; avatarUrl?: string | null };

export interface MyProfileResult {
  profile: MyProfile | null;
  loadError?: string;
}

export async function fetchMyProfile(): Promise<MyProfileResult> {
  let session: AuthenticatedUser | null;
  try {
    session = await getSession();
  } catch (error) {
    console.error("Failed to load own profile:", error);
    return { profile: null, loadError: "無法讀取個人資料，請稍後再試" };
  }

  if (!session) {
    return { profile: null };
  }

  return {
    profile: {
      displayName: session.displayName,
      department: session.department,
      phone: session.phone,
      email: session.email,
      avatarUrl: session.avatarUrl ?? null,
      role: session.role,
      isActive: session.isActive,
      mustChangePassword: session.mustChangePassword,
      preferences: session.notificationPreferences,
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

export async function updateMyAvatar(data: { imageDataUrl?: string; remove?: boolean }): Promise<AvatarResult> {
  return safeAction(async () => {
    const session = await getSession();
    if (!session) {
      return { success: false, error: "尚未登入，請先登入" };
    }

    const parsed = avatarInputSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message ?? "頭像格式不正確" };
    }

    const previousUrl = session.avatarUrl ?? null;
    if (parsed.data.remove) {
      const { error } = await session.supabase.from("profiles").update({ avatar_url: null }).eq("id", session.userId);

      if (error) {
        console.error("Failed to remove own avatar:", error);
        return { success: false, error: "移除頭像失敗，請稍後再試" };
      }

      await removeStoredAvatar(session.supabase, previousUrl, session.userId);
      return { success: true, avatarUrl: null };
    }

    if (!parsed.data.imageDataUrl) {
      return { success: true, avatarUrl: previousUrl };
    }

    const uploaded = await uploadAvatar(session.supabase, {
      userId: session.userId,
      imageDataUrl: parsed.data.imageDataUrl,
    });
    if (!uploaded.success || !uploaded.publicUrl) {
      return { success: false, error: uploaded.error };
    }

    const { error } = await session.supabase
      .from("profiles")
      .update({ avatar_url: uploaded.publicUrl })
      .eq("id", session.userId);

    if (error) {
      console.error("Failed to save own avatar url:", error);
      await removeStoredAvatar(session.supabase, uploaded.publicUrl, session.userId);
      return { success: false, error: "頭像儲存失敗，請稍後再試" };
    }

    await removeStoredAvatar(session.supabase, previousUrl, session.userId);
    return { success: true, avatarUrl: uploaded.publicUrl };
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

    return changePassword(createSupabaseAccountSecurityAdapter({ ...session, admin: createAdminClient() }), data);
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
