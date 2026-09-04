"use server";

import { revalidatePath } from "next/cache";

import { createAdminClient } from "@/lib/supabase/admin";
import { checkActiveAdminRetention, requireAdmin, safeAction, setUserActiveStatus, type UserRole } from "@/server/auth";

export interface UserItem {
  id: string;
  email: string;
  displayName: string | null;
  role: UserRole | null;
  department: string | null;
  phone: string | null;
  isActive: boolean;
  createdAt: string;
  lastSignInAt: string | null;
}

export interface UserStats {
  reporterStats: {
    total: number;
    pending: number;
    inProgress: number;
    completed: number;
    closed: number;
    cancelled: number;
  };
  technicianStats?: {
    totalAssigned: number;
    inProgress: number;
    completedOrClosed: number;
  };
}

export async function fetchUsers(): Promise<{ success: boolean; error?: string; users: UserItem[] }> {
  const result = await safeAction(async () => {
    await requireAdmin();

    const adminClient = createAdminClient();
    const { data: authData, error: authError } = await adminClient.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });

    if (authError) {
      console.error("Failed to fetch auth users via admin client:", authError);
      return { success: false, error: "無法讀取使用者帳號資料", users: [] };
    }

    const { data: profiles, error: profileError } = await adminClient.from("profiles").select("*");

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
      const metaRole = (authUser.user_metadata?.user_role as UserRole | undefined) || null;

      return {
        id: authUser.id,
        email: authUser.email ?? "",
        displayName: profile?.display_name ?? metaName,
        role: profile?.user_role ?? metaRole ?? null,
        department: profile?.department ?? (authUser.user_metadata?.department as string | undefined) ?? null,
        phone: profile?.phone ?? (authUser.user_metadata?.phone as string | undefined) ?? null,
        isActive: profile?.is_active ?? true,
        createdAt: authUser.created_at,
        lastSignInAt: authUser.last_sign_in_at ?? null,
      };
    });

    // Sort by status (active first) -> role (admin -> technician -> user) -> email
    users.sort((a, b) => {
      if (a.isActive !== b.isActive) {
        return a.isActive ? -1 : 1;
      }
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

export async function createUser(data: {
  email: string;
  password: string;
  displayName?: string;
  role: "admin" | "technician" | null;
  department?: string;
  phone?: string;
}): Promise<{ success: boolean; error?: string; userId?: string }> {
  return safeAction(async () => {
    await requireAdmin();

    const email = data.email.trim().toLowerCase();
    const password = data.password.trim();
    const displayName = data.displayName?.trim() || null;
    const department = data.department?.trim() || null;
    const phone = data.phone?.trim() || null;

    if (!email?.includes("@")) {
      return { success: false, error: "請輸入有效的 Email 地址" };
    }
    if (!password || password.length < 6) {
      return { success: false, error: "密碼長度至少需為 6 個字元" };
    }

    const adminClient = createAdminClient();

    // 1. Create auth user with pre-confirmed email
    const { data: authUser, error: authError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        display_name: displayName,
        department,
        phone,
        user_role: data.role,
      },
    });

    if (authError || !authUser?.user) {
      console.error("Failed to create auth user:", authError);
      return { success: false, error: authError?.message ?? "建立使用者帳號失敗" };
    }

    const newUserId = authUser.user.id;

    // 2. Upsert profile in DB using adminClient to bypass user-scoped RLS
    const { error: profileError } = await adminClient.from("profiles").upsert({
      id: newUserId,
      display_name: displayName,
      user_role: data.role,
      department,
      phone,
      is_active: true,
      updated_at: new Date().toISOString(),
    });

    if (profileError) {
      console.error("Failed to upsert profile for new user:", profileError);
      // Attempt rollback user creation if profile fails
      await adminClient.auth.admin.deleteUser(newUserId);
      return { success: false, error: "建立個人檔案失敗，已復原使用者帳號" };
    }

    revalidatePath("/dashboard/settings");
    return { success: true, userId: newUserId };
  });
}

export async function updateUserProfile(
  targetUserId: string,
  data: {
    displayName: string;
    role: "admin" | "technician" | null;
    department?: string | null;
    phone?: string | null;
  },
): Promise<{ success: boolean; error?: string }> {
  return safeAction(async () => {
    const { supabase } = await requireAdmin();
    const adminClient = createAdminClient();

    const trimmedDisplayName = data.displayName.trim();
    const department = data.department?.trim() || null;
    const phone = data.phone?.trim() || null;

    // 1. Check if demoting an admin and ensure at least one active admin remains
    const { data: targetProfile } = await supabase
      .from("profiles")
      .select("user_role")
      .eq("id", targetUserId)
      .maybeSingle();

    const isCurrentlyAdmin = targetProfile?.user_role === "admin";
    const willBeAdmin = data.role === "admin";

    if (isCurrentlyAdmin && !willBeAdmin) {
      const retentionCheck = await checkActiveAdminRetention({
        excludeUserIds: [targetUserId],
        client: supabase,
      });

      if (!retentionCheck.allowed) {
        return { success: false, error: `變更失敗：${retentionCheck.error}` };
      }
    }

    // 2. Upsert profile using adminClient
    const { error: upsertError } = await adminClient.from("profiles").upsert({
      id: targetUserId,
      display_name: trimmedDisplayName || null,
      user_role: data.role,
      department,
      phone,
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

export async function toggleUserActive(
  targetUserId: string,
  isActive: boolean,
): Promise<{ success: boolean; error?: string }> {
  return safeAction(async () => {
    const admin = await requireAdmin();
    const result = await setUserActiveStatus({
      actor: admin,
      userIds: [targetUserId],
      isActive,
    });

    if (!result.success) {
      return { success: false, error: result.error };
    }

    revalidatePath("/dashboard/settings");
    return { success: true };
  });
}

export async function batchToggleUserActive(
  targetUserIds: string[],
  isActive: boolean,
): Promise<{ success: boolean; error?: string; modifiedCount?: number }> {
  return safeAction(async () => {
    const admin = await requireAdmin();
    const result = await setUserActiveStatus({
      actor: admin,
      userIds: targetUserIds,
      isActive,
    });

    if (!result.success) {
      return { success: false, error: result.error };
    }

    revalidatePath("/dashboard/settings");
    return { success: true, modifiedCount: result.data.modifiedCount };
  });
}

export async function resetUserPassword(
  targetUserId: string,
  newPassword: string,
): Promise<{ success: boolean; error?: string }> {
  return safeAction(async () => {
    await requireAdmin();

    const password = newPassword.trim();
    if (!password || password.length < 6) {
      return { success: false, error: "新密碼長度至少需為 6 個字元" };
    }

    const adminClient = createAdminClient();
    const { error } = await adminClient.auth.admin.updateUserById(targetUserId, {
      password,
    });

    if (error) {
      console.error("Failed to reset user password:", error);
      return { success: false, error: error.message ?? "重設密碼失敗" };
    }

    return { success: true };
  });
}

export async function fetchUserStats(
  userId: string,
  userEmail: string,
  userRole: UserRole | null,
): Promise<{ success: boolean; error?: string; stats?: UserStats }> {
  return safeAction(async () => {
    const { supabase } = await requireAdmin();

    // 1. Fetch reporter tickets by email
    const { data: reporterTickets, error: reporterError } = await supabase
      .from("tickets")
      .select("id, status")
      .eq("reporter_email", userEmail);

    if (reporterError) {
      console.error("Failed to fetch reporter tickets for stats:", reporterError);
    }

    const repTickets = reporterTickets || [];
    const reporterStats = {
      total: repTickets.length,
      pending: repTickets.filter((t) => t.status === "pending").length,
      inProgress: repTickets.filter((t) => t.status === "in_progress").length,
      completed: repTickets.filter((t) => t.status === "completed").length,
      closed: repTickets.filter((t) => t.status === "closed").length,
      cancelled: repTickets.filter((t) => t.status === "cancelled").length,
    };

    let technicianStats: UserStats["technicianStats"] | undefined;

    // 2. If technician or admin, fetch assigned tickets
    if (userRole === "technician" || userRole === "admin") {
      const { data: assignedTickets, error: assignedError } = await supabase
        .from("tickets")
        .select("id, status")
        .eq("assigned_to", userId);

      if (assignedError) {
        console.error("Failed to fetch assigned tickets for stats:", assignedError);
      }

      const techTickets = assignedTickets || [];
      technicianStats = {
        totalAssigned: techTickets.length,
        inProgress: techTickets.filter((t) => t.status === "in_progress").length,
        completedOrClosed: techTickets.filter((t) => t.status === "completed" || t.status === "closed").length,
      };
    }

    return {
      success: true,
      stats: {
        reporterStats,
        technicianStats,
      },
    };
  });
}
