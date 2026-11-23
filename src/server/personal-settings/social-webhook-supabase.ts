import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/database.types";
import type { AuthenticatedUser } from "@/server/auth/session";

import type { SocialWebhookAdapter } from "./social-webhook";

type SocialDatabase = Database & {
  public: Omit<Database["public"], "Functions" | "Tables"> & {
    Functions: Database["public"]["Functions"] & {
      reserve_social_webhook_attempt: { Args: never; Returns: boolean };
    };
    Tables: Database["public"]["Tables"] & {
      social_webhook_attempts: {
        Insert: { account_id: string; id?: string; attempted_at?: string };
        Relationships: [];
        Row: { account_id: string; attempted_at: string; id: string };
        Update: { account_id?: string; attempted_at?: string; id?: string };
      };
      social_webhooks: {
        Insert: {
          account_id: string;
          created_at?: string;
          enabled?: boolean;
          target_fingerprint: string;
          updated_at?: string;
          webhook_url: string;
        };
        Relationships: [];
        Row: {
          account_id: string;
          created_at: string;
          enabled: boolean;
          target_fingerprint: string;
          updated_at: string;
          webhook_url: string;
        };
        Update: {
          account_id?: string;
          created_at?: string;
          enabled?: boolean;
          target_fingerprint?: string;
          updated_at?: string;
          webhook_url?: string;
        };
      };
    };
  };
};

export function createSupabaseSocialWebhookAdapter(context: {
  admin: SupabaseClient<Database>;
  session?: AuthenticatedUser;
}): SocialWebhookAdapter {
  const admin = context.admin as unknown as SupabaseClient<SocialDatabase>;

  async function readSocialWebhookStatus(userId: string): Promise<{ enabled: boolean } | null> {
    const { data, error } = await admin
      .from("social_webhooks")
      .select("enabled")
      .eq("account_id", userId)
      .maybeSingle();
    if (error) throw error;
    return data ? { enabled: data.enabled } : null;
  }

  return {
    async recordAttempt() {
      if (!context.session) throw new Error("Session is required to record a social webhook attempt");
      const { data, error } = await context.session.supabase.rpc("reserve_social_webhook_attempt");
      if (error) throw error;
      return { rateLimited: data !== true };
    },
    async saveBinding(input) {
      if (!context.session) throw new Error("Session is required to save a social webhook");
      const { error } = await admin.from("social_webhooks").upsert(
        {
          account_id: context.session.userId,
          enabled: input.enabled,
          target_fingerprint: input.fingerprint,
          webhook_url: input.webhookUrl,
        },
        { onConflict: "account_id" },
      );
      if (error) throw error;
    },
    async setBindingEnabled(enabled) {
      if (!context.session) throw new Error("Session is required to update a social webhook");
      const { data, error } = await admin
        .from("social_webhooks")
        .update({ enabled })
        .eq("account_id", context.session.userId)
        .select("account_id")
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("Social webhook binding not found");
    },
    async removeBinding() {
      if (!context.session) throw new Error("Session is required to remove a social webhook");
      const { error } = await admin.from("social_webhooks").delete().eq("account_id", context.session.userId);
      if (error) throw error;
    },
  };
}

export async function readSocialWebhookStatus(
  context: { admin: SupabaseClient<Database> },
  userId: string,
): Promise<{ enabled: boolean } | null> {
  const admin = context.admin as unknown as SupabaseClient<SocialDatabase>;
  const { data, error } = await admin
    .from("social_webhooks")
    .select("enabled")
    .eq("account_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data ? { enabled: data.enabled } : null;
}
