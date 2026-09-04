import type { SupabaseClient } from "@supabase/supabase-js";

import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/database.types";

import type { AdminContext } from "./session";

export type SetUserActiveInput = {
  actor: AdminContext | { userId: string };
  userIds: string[];
  isActive: boolean;
  adminClient?: SupabaseClient<Database>;
};

export type SetUserActiveErrorCode =
  | "VALIDATION_FAILED"
  | "SELF_DEACTIVATION"
  | "LAST_ADMIN_INVARIANT"
  | "DATABASE_ERROR";

export type SetUserActiveResult =
  | {
      success: true;
      data: {
        modifiedCount: number;
        affectedUserIds: string[];
      };
    }
  | {
      success: false;
      error: string;
      code: SetUserActiveErrorCode;
    };

export type CheckAdminRetentionInput = {
  excludeUserIds: string[];
  client?: SupabaseClient<Database>;
};

export type CheckAdminRetentionResult =
  | {
      allowed: true;
      remainingCount: number;
    }
  | {
      allowed: false;
      error: string;
      remainingCount?: number;
    };

/**
 * Checks whether at least one active administrator remains if the specified user IDs are excluded/demoted/deactivated.
 */
export async function checkActiveAdminRetention(input: CheckAdminRetentionInput): Promise<CheckAdminRetentionResult> {
  const client = input.client ?? createAdminClient();

  const { count, error: countError } = await client
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("user_role", "admin")
    .eq("is_active", true);

  if (countError) {
    console.error("Failed to count active admins:", countError);
    return {
      allowed: false,
      error: "檢查管理員數量失敗",
    };
  }

  const activeAdminCount = count ?? 0;
  const remainingCount = activeAdminCount - input.excludeUserIds.length;

  if (remainingCount <= 0) {
    return {
      allowed: false,
      error: "系統必須保留至少一位啟用的系統管理者 (Admin)",
      remainingCount,
    };
  }

  return {
    allowed: true,
    remainingCount,
  };
}

/**
 * Safely changes the active status of one or more users.
 * Guarantees self-deactivation protection, the last-active-admin invariant,
 * and dual-store coordination between Postgres profiles and Supabase Auth.
 */
export async function setUserActiveStatus(input: SetUserActiveInput): Promise<SetUserActiveResult> {
  const { actor, userIds, isActive } = input;

  if (userIds.length === 0) {
    return {
      success: false,
      error: "請選擇至少一位使用者",
      code: "VALIDATION_FAILED",
    };
  }

  // 1. Guard against self-deactivation
  const filteredUserIds = isActive ? userIds : userIds.filter((id) => id !== actor.userId);

  if (filteredUserIds.length === 0) {
    return {
      success: false,
      error: "無法停用您自己的管理員帳號",
      code: "SELF_DEACTIVATION",
    };
  }

  const adminClient = input.adminClient ?? createAdminClient();

  // 2. Guard against deactivating the last active admin
  if (!isActive) {
    const { data: targetAdmins, error: targetAdminsError } = await adminClient
      .from("profiles")
      .select("id")
      .in("id", filteredUserIds)
      .eq("user_role", "admin")
      .eq("is_active", true);

    if (targetAdminsError) {
      console.error("Failed to check target admin statuses:", targetAdminsError);
      return {
        success: false,
        error: "檢查管理員狀態失敗",
        code: "DATABASE_ERROR",
      };
    }

    const targetAdminIds = (targetAdmins ?? []).map((a) => a.id);
    if (targetAdminIds.length > 0) {
      const retentionCheck = await checkActiveAdminRetention({
        excludeUserIds: targetAdminIds,
        client: adminClient,
      });

      if (!retentionCheck.allowed) {
        return {
          success: false,
          error: `操作失敗：${retentionCheck.error}`,
          code: "LAST_ADMIN_INVARIANT",
        };
      }
    }
  }

  // 3. Update DB profiles table
  const { error: updateError } = await adminClient
    .from("profiles")
    .update({
      is_active: isActive,
      updated_at: new Date().toISOString(),
    })
    .in("id", filteredUserIds);

  if (updateError) {
    console.error("Failed to update profile is_active status:", updateError);
    return {
      success: false,
      error: filteredUserIds.length > 1 ? "批次更新使用者狀態失敗" : "更新使用者啟用狀態失敗",
      code: "DATABASE_ERROR",
    };
  }

  // 4. Secondary defense: Synchronize Supabase Auth bans in parallel with error tolerance
  const banDuration = isActive ? "none" : "876000h";
  const authResults = await Promise.allSettled(
    filteredUserIds.map((id) =>
      adminClient.auth.admin.updateUserById(id, {
        ban_duration: banDuration,
      }),
    ),
  );

  for (const res of authResults) {
    if (res.status === "rejected") {
      console.warn("Supabase auth ban sync warning:", res.reason);
    }
  }

  return {
    success: true,
    data: {
      modifiedCount: filteredUserIds.length,
      affectedUserIds: filteredUserIds,
    },
  };
}
