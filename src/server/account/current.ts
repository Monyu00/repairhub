import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/database.types";
import type { UserProjection } from "@/lib/users/projection";
import { type NotificationPreferences, resolveNotificationPreferences } from "@/server/personal-settings/input";

import { type AccountSource, mapAccountSource } from "./source";

export interface CurrentAccount extends UserProjection {
  notificationPreferences: NotificationPreferences;
}

export interface AccountAdapter {
  readCurrent(): Promise<AccountSource | null>;
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
        .select(
          "display_name, department, phone, avatar_url, user_role, is_active, must_change_password, notification_preferences",
        )
        .eq("id", user.id)
        .maybeSingle();

      if (profileError) throw profileError;
      return { user, profile };
    },
  };
}

export async function readCurrentAccount(adapter: AccountAdapter): Promise<CurrentAccount | null> {
  const source = await adapter.readCurrent();
  if (!source) return null;

  const projection = mapAccountSource(source);
  if (!projection) return null;
  if (!projection.isActive) return null;

  return {
    ...projection,
    notificationPreferences: resolveNotificationPreferences(source.profile?.notification_preferences),
  };
}
