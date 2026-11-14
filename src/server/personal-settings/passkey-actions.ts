"use server";

import type { PasskeyListItem } from "@supabase/supabase-js";
import { z } from "zod";

import { describePasskeyError } from "@/lib/supabase/passkey-errors";
import { requireAuth, safeAction } from "@/server/auth/session";

export type PasskeyListResult = { success: true; passkeys: PasskeyListItem[] } | { success: false; error: string };

export type PasskeyActionResult = { success: boolean; error?: string };

const passkeyIdSchema = z.string().uuid("Passkey 識別碼不正確");

export async function listMyPasskeys(): Promise<PasskeyListResult> {
  return safeAction(async () => {
    const session = await requireAuth();
    const { data, error } = await session.supabase.auth.passkey.list();

    if (error) {
      console.error("Failed to list passkeys:", error);
      return { success: false, error: describePasskeyError(error) };
    }

    return { success: true, passkeys: data ?? [] };
  }) as Promise<PasskeyListResult>;
}

export async function getPasskeyRegistrationAccess(): Promise<PasskeyActionResult> {
  return safeAction(async () => {
    await requireAuth();
    return { success: true };
  });
}

export async function deleteMyPasskey(data: { passkeyId: string }): Promise<PasskeyActionResult> {
  return safeAction(async () => {
    const session = await requireAuth();
    const parsed = passkeyIdSchema.safeParse(data.passkeyId);

    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message ?? "Passkey 識別碼不正確" };
    }

    const { error } = await session.supabase.auth.passkey.delete({ passkeyId: parsed.data });

    if (error) {
      console.error("Failed to delete passkey:", error);
      return { success: false, error: describePasskeyError(error) };
    }

    return { success: true };
  });
}
