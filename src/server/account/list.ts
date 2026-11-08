import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/database.types";
import { compareUserProjection, resolveUserProjection, type UserProjection } from "@/lib/users/projection";
import { type NotificationPreferences, resolveNotificationPreferences } from "@/server/personal-settings/input";

const MAX_ACCOUNT_LIST_SIZE = 1000;

export interface ListAccount extends UserProjection {
  createdAt: string;
  lastSignInAt: string | null;
  notificationPreferences: NotificationPreferences;
}

export interface AccountListSource {
  user: Parameters<typeof resolveUserProjection>[0] & {
    created_at: string;
    last_sign_in_at?: string | null;
  };
  profile?: (Parameters<typeof resolveUserProjection>[1] & { notification_preferences?: unknown }) | null;
}

export interface AccountListAdapter {
  readList(): Promise<AccountListSource[]>;
}

export function createSupabaseAccountListAdapter(supabase: SupabaseClient<Database>): AccountListAdapter {
  return {
    async readList() {
      const { data: authData, error: authError } = await supabase.auth.admin.listUsers({
        page: 1,
        perPage: MAX_ACCOUNT_LIST_SIZE,
      });

      if (authError) throw authError;

      const { data: profiles, error: profileError } = await supabase.from("profiles").select("*");
      if (profileError) throw profileError;

      const profileMap = new Map((profiles ?? []).map((profile) => [profile.id, profile]));

      return (authData.users ?? []).map((user) => ({
        user,
        profile: profileMap.get(user.id) ?? null,
      }));
    },
  };
}

export async function readAccountList(adapter: AccountListAdapter): Promise<ListAccount[]> {
  const sources = await adapter.readList();

  return sources
    .map(({ user, profile }) => ({
      ...resolveUserProjection(user, profile),
      createdAt: user.created_at,
      lastSignInAt: user.last_sign_in_at ?? null,
      notificationPreferences: resolveNotificationPreferences(profile?.notification_preferences),
    }))
    .sort(compareUserProjection);
}
