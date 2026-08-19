"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { transitionTicket } from "@/server/tickets/lifecycle";

interface ActionResult {
  success: boolean;
  error?: string;
}

/**
 * Thin Adapter: Confirms repair fix and closes the ticket (Reporter).
 */
export async function confirmFix(ticketId: string, email: string): Promise<ActionResult> {
  if (!email.trim()) {
    return { success: false, error: "請輸入電子郵件地址" };
  }

  const supabase = createAdminClient();

  const result = await transitionTicket(supabase, {
    ticketId,
    transition: "confirm_fix",
    actor: { type: "reporter", email: email.trim() },
  });

  return result.success ? { success: true } : { success: false, error: result.error };
}

/**
 * Thin Adapter: Reopens an unfinished or unresolved ticket (Reporter).
 */
export async function reopenTicket(ticketId: string, email: string, feedback: string): Promise<ActionResult> {
  if (!email.trim()) {
    return { success: false, error: "請輸入電子郵件地址" };
  }

  if (!feedback.trim()) {
    return { success: false, error: "請輸入問題反饋說明" };
  }

  const supabase = createAdminClient();

  const result = await transitionTicket(supabase, {
    ticketId,
    transition: "reopen",
    feedback: feedback.trim(),
    actor: { type: "reporter", email: email.trim() },
  });

  return result.success ? { success: true } : { success: false, error: result.error };
}
