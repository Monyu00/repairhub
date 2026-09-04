"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin, requireAuth, safeAction } from "@/server/auth";
import { actorFromAuthUser, transitionTicket } from "@/server/tickets/lifecycle";

/**
 * Adds a progress note to the ticket without changing its status.
 */
export async function addProgressNote(
  ticketId: string,
  content: string,
): Promise<{ success: boolean; error?: string }> {
  return safeAction(async () => {
    if (!content.trim()) {
      return { success: false, error: "備註內容不可為空白" };
    }

    const user = await requireAuth();
    const { supabase, userId, role } = user;

    // Check ticket and permission
    const { data: ticket, error: ticketError } = await supabase
      .from("tickets")
      .select("id, status, assigned_to")
      .eq("id", ticketId)
      .single();

    if (ticketError || !ticket) {
      return { success: false, error: "找不到該單據" };
    }

    const isAssignedTech = ticket.assigned_to === userId;
    const isAdmin = role === "admin";

    if (!isAssignedTech && !isAdmin) {
      return { success: false, error: "無權限為此單據新增進度備註" };
    }

    const { error: insertError } = await supabase.from("ticket_notes").insert({
      ticket_id: ticketId,
      author_id: userId,
      content: content.trim(),
      type: "note",
    });

    if (insertError) {
      console.error("Failed to insert progress note:", insertError);
      return { success: false, error: "新增備註失敗，請稍後再試" };
    }

    revalidatePath(`/dashboard/tickets/${ticketId}`);
    return { success: true };
  });
}

/**
 * Fetches technician list for admin assignment dropdown.
 */
export async function fetchTechnicians(): Promise<{
  success: boolean;
  error?: string;
  technicians: Array<{ id: string; displayName: string }>;
}> {
  const result = await safeAction(async () => {
    const { supabase } = await requireAdmin();

    const { data: technicians, error: techError } = await supabase
      .from("profiles")
      .select("id, display_name")
      .eq("user_role", "technician");

    if (techError) {
      console.error("Failed to fetch technicians:", techError);
      return { success: false, error: "無法取得技師列表", technicians: [] };
    }

    const formattedTechs = (technicians || []).map((t) => ({
      id: t.id,
      displayName: t.display_name || `技師 (${t.id.slice(0, 8)})`,
    }));

    return { success: true, technicians: formattedTechs };
  });

  if (!result.success) {
    return { success: false, error: result.error, technicians: [] };
  }

  return result;
}

/**
 * Thin Adapter: Claims a pending ticket for the authenticated technician.
 */
export async function claimTicket(ticketId: string): Promise<{ success: boolean; error?: string }> {
  return safeAction(async () => {
    const user = await requireAuth();

    if (user.role !== "technician") {
      return { success: false, error: "僅技師身分可進行接單" };
    }

    const result = await transitionTicket(user.supabase, {
      ticketId,
      transition: "claim",
      actor: { type: "technician", userId: user.userId },
    });

    return result.success ? { success: true } : { success: false, error: result.error };
  });
}

/**
 * Thin Adapter: Assigns a pending ticket to a designated technician (Admin only).
 */
export async function assignTicket(
  ticketId: string,
  technicianId: string,
): Promise<{ success: boolean; error?: string }> {
  return safeAction(async () => {
    const admin = await requireAdmin();

    const result = await transitionTicket(admin.supabase, {
      ticketId,
      transition: "assign",
      technicianId,
      actor: { type: "admin", userId: admin.userId },
    });

    return result.success ? { success: true } : { success: false, error: result.error };
  });
}

/**
 * Thin Adapter: Submits repair closure with completion photos (Technician or Admin).
 */
export async function submitClosure(
  ticketId: string,
  summary: string,
  photosBase64: string[],
): Promise<{ success: boolean; error?: string }> {
  return safeAction(async () => {
    const user = await requireAuth();
    const actor = actorFromAuthUser(user);

    const result = await transitionTicket(user.supabase, {
      ticketId,
      transition: "submit_closure",
      summary,
      photosBase64,
      actor,
    });

    return result.success ? { success: true } : { success: false, error: result.error };
  });
}

/**
 * Thin Adapter: Cancels a ticket with a stated reason (Admin only).
 */
export async function cancelTicket(ticketId: string, reason: string): Promise<{ success: boolean; error?: string }> {
  return safeAction(async () => {
    const admin = await requireAdmin();

    const result = await transitionTicket(admin.supabase, {
      ticketId,
      transition: "cancel",
      reason,
      actor: { type: "admin", userId: admin.userId },
    });

    return result.success ? { success: true } : { success: false, error: result.error };
  });
}

/**
 * Thin Adapter: Returns an in-progress ticket back to pending status (Admin only).
 */
export async function returnToPending(ticketId: string): Promise<{ success: boolean; error?: string }> {
  return safeAction(async () => {
    const admin = await requireAdmin();

    const result = await transitionTicket(admin.supabase, {
      ticketId,
      transition: "return_to_pending",
      actor: { type: "admin", userId: admin.userId },
    });

    return result.success ? { success: true } : { success: false, error: result.error };
  });
}
