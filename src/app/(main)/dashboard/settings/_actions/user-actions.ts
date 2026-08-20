"use server";

import { revalidatePath } from "next/cache";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin, safeAction, type UserRole } from "@/server/auth";

export interface UserItem {
  id: string;
  email: string;
  displayName: string | null;
  role: UserRole | null;
  createdAt: string;
  lastSignInAt: string | null;
}

export async function fetchUsers(): Promise<{ success: boolean; error?: string; users: UserItem[] }> {
  const result = await safeAction(async () => {
    const { supabase } = await requireAdmin();

    const adminClient = createAdminClient();
    const { data: authData, error: authError } = await adminClient.auth.admin.listUsers();

    if (authError) {
      console.error("Failed to fetch auth users via admin client:", authError);
      return { success: false, error: "無法讀取使用者帳號資料", users: [] };
    }

    const { data: profiles, error: profileError } = await supabase.from("profiles").select("*");

    if (profileError) {
      console.error("Failed to fetch profiles:", profileError);
      return { success: false, error: "無法讀取使用者個人檔案資料", users: [] };
    }

    const profileMap = new Map((profiles || []).map((p) => [p.id, p]));

    const users: UserItem[] = (authData.users || []).map((authUser) => {
      const profile = profileMap.get(authUser.id);
      const metaName =
        (authUser.user_metadata?.full_name as string) ||
        (authUser.user_metadata?.name as string) ||
        (authUser.user_metadata?.display_name as string) ||
        null;

      return {
        id: authUser.id,
        email: authUser.email ?? "",
        displayName: profile?.display_name ?? metaName,
        role: profile?.user_role ?? null,
        createdAt: authUser.created_at,
        lastSignInAt: authUser.last_sign_in_at ?? null,
      };
    });

    // Sort by role (admin -> technician -> null) then by email
    users.sort((a, b) => {
      const roleScore = (r: UserItem["role"]) => {
        if (r === "admin") return 0;
        if (r === "technician") return 1;
        return 2;
      };
      const scoreA = roleScore(a.role);
      const scoreB = roleScore(b.role);
      if (scoreA !== scoreB) return scoreA - scoreB;
      return a.email.localeCompare(b.email);
    });

    return { success: true, users };
  });

  if (!result.success) {
    return { success: false, error: result.error, users: [] };
  }

  return result;
}

export async function updateUserProfile(
  targetUserId: string,
  data: { displayName: string; role: "admin" | "technician" | null },
): Promise<{ success: boolean; error?: string }> {
  return safeAction(async () => {
    const { supabase } = await requireAdmin();

    const trimmedDisplayName = data.displayName.trim();

    // 1. Check if demoting an admin and ensure at least one admin remains
    const { data: targetProfile } = await supabase
      .from("profiles")
      .select("user_role")
      .eq("id", targetUserId)
      .maybeSingle();

    const isCurrentlyAdmin = targetProfile?.user_role === "admin";
    const willBeAdmin = data.role === "admin";

    if (isCurrentlyAdmin && !willBeAdmin) {
      const { count, error: countError } = await supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("user_role", "admin");

      if (countError) {
        console.error("Failed to count admins:", countError);
        return { success: false, error: "檢查管理者數量失敗" };
      }

      if ((count ?? 0) <= 1) {
        return { success: false, error: "變更失敗：系統必須保留至少一位系統管理者 (Admin)" };
      }
    }

    // 2. Upsert profile
    const { error: upsertError } = await supabase.from("profiles").upsert({
      id: targetUserId,
      display_name: trimmedDisplayName || null,
      user_role: data.role,
      updated_at: new Date().toISOString(),
    });

    if (upsertError) {
      console.error("Failed to update user profile:", upsertError);
      return { success: false, error: "更新使用者資料失敗，請稍後再試" };
    }

    revalidatePath("/dashboard/settings");
    return { success: true };
  });
}
