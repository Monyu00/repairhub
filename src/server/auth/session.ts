import { cache } from "react";

import { redirect } from "next/navigation";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";
import { type CurrentAccount, createSupabaseAccountAdapter, readCurrentAccount } from "@/server/account/current";

export interface AuthenticatedUser extends Omit<CurrentAccount, "avatarUrl" | "id"> {
  userId: string;
  avatarUrl?: string;
  supabase: SupabaseClient<Database>;
}

export interface AdminContext extends AuthenticatedUser {
  role: "admin";
}

export type AuthErrorCode = "UNAUTHENTICATED" | "FORBIDDEN";

export class AuthError extends Error {
  constructor(
    public readonly code: AuthErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "AuthError";
  }
}

/**
 * Retrieves the current authenticated user and profile without throwing.
 * Returns null if not logged in.
 * Deduplicated per-request via React cache().
 */
export const getSession = cache(async (): Promise<AuthenticatedUser | null> => {
  const supabase = await createClient();
  const account = await readCurrentAccount(createSupabaseAccountAdapter(supabase));
  if (!account) return null;

  const { id: userId, avatarUrl, ...identity } = account;

  return {
    ...identity,
    userId,
    avatarUrl: avatarUrl ?? undefined,
    supabase,
  };
});

/**
 * Guard that requires an authenticated user session.
 * Throws AuthError("UNAUTHENTICATED") if not logged in.
 */
export async function requireAuth(): Promise<AuthenticatedUser> {
  const session = await getSession();
  if (!session) {
    throw new AuthError("UNAUTHENTICATED", "尚未登入，請先登入");
  }
  if (session.mustChangePassword) {
    throw new AuthError("FORBIDDEN", "請先變更密碼後再繼續使用系統");
  }
  return session;
}

/**
 * Guard that requires an admin user session.
 * Throws AuthError("UNAUTHENTICATED") if not logged in,
 * or AuthError("FORBIDDEN") if not an admin.
 */
export async function requireAdmin(): Promise<AdminContext> {
  const session = await requireAuth();
  if (session.role !== "admin") {
    throw new AuthError("FORBIDDEN", "僅系統管理者可執行此操作");
  }
  return session as AdminContext;
}

export type DashboardSession = AuthenticatedUser & { role: "admin" | "technician" };

/**
 * Guard for the back-office shell (/dashboard). General accounts and accounts that
 * still owe a password change never enter it: Personal Settings is a dialog opened
 * from the user menu instead.
 */
export async function requireDashboardAccess(): Promise<DashboardSession> {
  const session = await getSession();

  if (!session || (session.role !== "admin" && session.role !== "technician")) {
    redirect("/");
  }

  if (session.mustChangePassword) {
    redirect("/change-password");
  }

  return session as DashboardSession;
}

/**
 * Safe action wrapper for server actions.
 * Catches AuthError and generic errors, returning a flat { success: false, error } response.
 */
export async function safeAction<T>(action: () => Promise<T>): Promise<T | { success: false; error: string }> {
  try {
    return await action();
  } catch (error) {
    if (error instanceof AuthError) {
      return { success: false, error: error.message };
    }
    console.error("Server action error:", error);
    return { success: false, error: "伺服器發生錯誤，請稍後再試" };
  }
}
