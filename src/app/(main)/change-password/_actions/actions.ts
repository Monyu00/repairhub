"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import {
  changeRequiredPassword as applyRequiredPassword,
  createSupabaseAccountSecurityAdapter,
} from "@/server/account/security";
import { getSession } from "@/server/auth/session";

export async function changeRequiredPassword(password: string) {
  const session = await getSession();
  if (!session) {
    return { success: false, error: "尚未登入，請先登入" };
  }
  if (!session.mustChangePassword) {
    return { success: false, error: "此帳號不需要變更密碼" };
  }

  return applyRequiredPassword(
    createSupabaseAccountSecurityAdapter({ ...session, admin: createAdminClient() }),
    password,
  );
}
