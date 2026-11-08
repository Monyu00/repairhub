"use server";

import { requireAuth, safeAction } from "@/server/auth";
import { getTechnicianQueueTickets } from "@/server/tickets/read";

/**
 * Loads the authenticated technician's pending queue through the ticket read scope.
 */
export async function fetchTechnicianQueue(): Promise<
  | {
      success: true;
      tickets: Awaited<ReturnType<typeof getTechnicianQueueTickets>>["tickets"];
      subscribedCategoryIds: string[];
    }
  | { success: false; error?: string }
> {
  const result = await safeAction(async () => {
    const user = await requireAuth();

    if (user.role !== "technician") {
      return { success: true as const, tickets: [], subscribedCategoryIds: [] };
    }

    const queue = await getTechnicianQueueTickets(user.supabase, {
      viewerContext: { role: user.role, userId: user.userId, email: user.email },
    });

    return { success: true as const, ...queue };
  });

  if (!result.success) {
    return { success: false, error: result.error };
  }

  return result;
}
