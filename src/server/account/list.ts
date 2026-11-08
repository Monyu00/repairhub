import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/database.types";
import { compareUserProjection, type UserProjection } from "@/lib/users/projection";
import { type NotificationPreferences, resolveNotificationPreferences } from "@/server/personal-settings/input";

import { type AccountSource, mapAccountSource } from "./source";

const MAX_ACCOUNT_LIST_SIZE = 1000;

export interface ListAccount extends UserProjection {
  createdAt: string;
  lastSignInAt: string | null;
  notificationPreferences: NotificationPreferences;
}

export interface AccountListSource {
  user: AccountSource["user"] & {
    created_at: string;
    last_sign_in_at?: string | null;
  };
  profile?: AccountSource["profile"];
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
    .map((source) => {
      const projection = mapAccountSource(source);
      if (!projection) return null;

      return {
        ...projection,
        createdAt: source.user.created_at,
        lastSignInAt: source.user.last_sign_in_at ?? null,
        notificationPreferences: resolveNotificationPreferences(source.profile?.notification_preferences),
      };
    })
    .filter((account): account is ListAccount => account !== null)
    .sort(compareUserProjection);
}
