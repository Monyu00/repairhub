import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";

export type UserRole = Database["public"]["Enums"]["user_role"];

export interface AuthenticatedUser {
  userId: string;
  email: string;
  role: UserRole | null;
  displayName: string | null;
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
 */
export async function getSession(): Promise<AuthenticatedUser | null> {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return null;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("user_role, display_name")
    .eq("id", user.id)
    .maybeSingle();

  const metaName =
    (user.user_metadata?.full_name as string) ||
    (user.user_metadata?.name as string) ||
    (user.user_metadata?.display_name as string) ||
    null;

  return {
    userId: user.id,
    email: user.email ?? "",
    role: profile?.user_role ?? null,
    displayName: profile?.display_name ?? metaName,
    supabase,
  };
}

/**
 * Guard that requires an authenticated user session.
 * Throws AuthError("UNAUTHENTICATED") if not logged in.
 */
export async function requireAuth(): Promise<AuthenticatedUser> {
  const session = await getSession();
  if (!session) {
    throw new AuthError("UNAUTHENTICATED", "尚未登入，請先登入");
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
