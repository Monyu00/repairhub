"use server";

import { revalidatePath } from "next/cache";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth, safeAction } from "@/server/auth";
import { markAllNotificationsReadForUser, markNotificationReadForUser } from "@/server/notifications/read";

// Read-only RLS was defined by #184; owned updates use the service role but stay recipient-scoped.
export async function markNotificationRead(notificationId: string) {
  return safeAction(async () => {
    const user = await requireAuth();

    const result = await markNotificationReadForUser(createAdminClient(), user.userId, notificationId);
    if (!result.success) return { success: false as const, error: "標記通知失敗，請稍後再試" };

    revalidatePath("/dashboard", "layout");
    return { success: true as const, ticketId: result.ticketId };
  });
}

export async function markAllNotificationsRead() {
  return safeAction(async () => {
    const user = await requireAuth();

    const result = await markAllNotificationsReadForUser(createAdminClient(), user.userId);
    if (!result.success) return { success: false as const, error: "全部標記失敗，請稍後再試" };

    revalidatePath("/dashboard", "layout");
    return { success: true as const };
  });
}
