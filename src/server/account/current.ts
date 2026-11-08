import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/database.types";
import { resolveUserProjection, type UserRole } from "@/lib/users/projection";
import { type NotificationPreferences, resolveNotificationPreferences } from "@/server/personal-settings/input";

export interface CurrentAccount {
  id: string;
  email: string;
  displayName: string | null;
  role: UserRole | null;
  department: string | null;
  phone: string | null;
  avatarUrl: string | null;
  isActive: boolean;
  mustChangePassword: boolean;
  notificationPreferences: NotificationPreferences;
}

export interface AccountAdapter {
  readCurrent(): Promise<{
    user: Parameters<typeof resolveUserProjection>[0];
    profile?: (Parameters<typeof resolveUserProjection>[1] & { notification_preferences?: unknown }) | null;
  } | null>;
}

export function createSupabaseAccountAdapter(supabase: SupabaseClient<Database>): AccountAdapter {
  return {
    async readCurrent() {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error || !user) return null;

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("display_name, department, phone, user_role, is_active, must_change_password, notification_preferences")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError) throw profileError;
      return { user, profile };
    },
  };
}

export async function readCurrentAccount(adapter: AccountAdapter): Promise<CurrentAccount | null> {
  const source = await adapter.readCurrent();
  if (!source?.user || !source.profile) return null;

  const projection = resolveUserProjection(source.user, source.profile);
  if (!projection.isActive) return null;

  return {
    ...projection,
    notificationPreferences: resolveNotificationPreferences(source.profile.notification_preferences),
  };
}
