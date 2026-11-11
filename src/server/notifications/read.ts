import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/database.types";

type NotificationDatabase = Omit<Database, "public"> & {
  public: Database["public"] & {
    Tables: Database["public"]["Tables"] & {
      notifications: {
        Row: {
          created_at: string;
          event_type: string;
          id: string;
          is_read: boolean;
          recipient_id: string;
          ticket_id: string;
        };
        Insert: {
          created_at?: string;
          event_type: string;
          id?: string;
          is_read?: boolean;
          recipient_id: string;
          ticket_id: string;
        };
        Update: {
          created_at?: string;
          event_type?: string;
          id?: string;
          is_read?: boolean;
          recipient_id?: string;
          ticket_id?: string;
        };
        Relationships: [];
      };
    };
  };
};

export type NotificationReadAdapter = SupabaseClient<NotificationDatabase>;

export interface TechnicianNotification {
  id: string;
  ticketId: string;
  isRead: boolean;
  createdAt: string;
}

export interface TechnicianNotificationsResult {
  notifications: TechnicianNotification[];
  unreadCount: number;
}

export interface MarkNotificationResult {
  success: boolean;
  ticketId?: string;
}

const MAX_NOTIFICATIONS = 20;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function parseNotification(row: unknown): TechnicianNotification | null {
  if (typeof row !== "object" || row === null) return null;
  const value = row as Record<string, unknown>;
  if (
    typeof value.id !== "string" ||
    typeof value.ticket_id !== "string" ||
    typeof value.is_read !== "boolean" ||
    typeof value.created_at !== "string"
  ) {
    return null;
  }

  return {
    id: value.id,
    ticketId: value.ticket_id,
    isRead: value.is_read,
    createdAt: value.created_at,
  };
}

export async function getTechnicianNotifications(
  adapter: NotificationReadAdapter,
  userId: string,
): Promise<TechnicianNotificationsResult> {
  const empty = { notifications: [], unreadCount: 0 };
  if (!UUID_PATTERN.test(userId)) return empty;

  const [listResult, unreadResult] = await Promise.all([
    adapter
      .from("notifications")
      .select("id,ticket_id,is_read,created_at")
      .eq("recipient_id", userId)
      .order("created_at", { ascending: false })
      .range(0, MAX_NOTIFICATIONS - 1),
    adapter
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("recipient_id", userId)
      .eq("is_read", false),
  ]);

  if (listResult.error || unreadResult.error) {
    console.error("getTechnicianNotifications error:", listResult.error ?? unreadResult.error);
    return empty;
  }

  const notifications = (listResult.data ?? []).map(parseNotification);
  if (notifications.some((notification) => notification === null) || typeof unreadResult.count !== "number") {
    console.error("getTechnicianNotifications received malformed data");
    return empty;
  }

  return {
    notifications: notifications as TechnicianNotification[],
    unreadCount: unreadResult.count,
  };
}

export async function markTechnicianNotificationRead(
  adapter: NotificationReadAdapter,
  userId: string,
  notificationId: string,
): Promise<MarkNotificationResult> {
  if (!UUID_PATTERN.test(userId) || !UUID_PATTERN.test(notificationId)) return { success: false };

  const { data, error } = await adapter
    .from("notifications")
    .update({ is_read: true })
    .eq("id", notificationId)
    .eq("recipient_id", userId)
    .select("ticket_id")
    .single();

  if (error || !data || typeof data !== "object" || !UUID_PATTERN.test(data.ticket_id)) {
    console.error("markTechnicianNotificationRead failed:", error ?? new Error("Malformed notification data"));
    return { success: false };
  }

  return { success: true, ticketId: data.ticket_id };
}

export async function markAllTechnicianNotificationsRead(
  adapter: NotificationReadAdapter,
  userId: string,
): Promise<MarkNotificationResult> {
  if (!UUID_PATTERN.test(userId)) return { success: false };

  const { error } = await adapter
    .from("notifications")
    .update({ is_read: true })
    .eq("recipient_id", userId)
    .eq("is_read", false);

  if (error) {
    console.error("markAllTechnicianNotificationsRead failed:", error);
    return { success: false };
  }

  return { success: true };
}
