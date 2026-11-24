/// <reference lib="deno.ns" />

import { createClient } from "@supabase/supabase-js";

import {
  createRequestHandler,
  DiscordSendError,
  type DiscordSender,
  MissingSocialTargetError,
  type NotificationRepository,
  type RequestHandlerDependencies,
  type TicketSocialDisplayData,
} from "./handler.ts";

type JsonRecord = Record<string, unknown>;

function firstRelation(value: unknown): JsonRecord {
  if (Array.isArray(value)) return (value[0] ?? {}) as JsonRecord;
  return (value ?? {}) as JsonRecord;
}

function readServiceKey(): string {
  const legacyServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (legacyServiceRoleKey) return legacyServiceRoleKey;

  const secretKeys = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (!secretKeys) return "";

  try {
    const parsed = JSON.parse(secretKeys) as Record<string, string>;
    return parsed.default || Object.values(parsed)[0] || "";
  } catch {
    return "";
  }
}

function createRepository(supabaseUrl: string, serviceKey: string): NotificationRepository {
  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  return {
    async claimDelivery(deliveryId) {
      const { data, error } = await supabase
        .rpc("claim_social_notification_delivery", { p_delivery_id: deliveryId })
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      const row = data as unknown as JsonRecord;
      return {
        id: String(row.id),
        ticketId: String(row.ticket_id),
        eventType: String(row.event_type),
        eventKey: String(row.event_key),
        targetFingerprint: String(row.target_fingerprint),
        eventAt: String(row.event_at),
        attemptCount: Number(row.attempt_count),
      };
    },

    async getTicketData(delivery) {
      const { data: webhookUrl, error: targetError } = await supabase.rpc("resolve_social_notification_target", {
        p_target_fingerprint: delivery.targetFingerprint,
        p_event_type: delivery.eventType,
      });

      if (targetError) throw targetError;
      if (typeof webhookUrl !== "string" || webhookUrl === "") throw new MissingSocialTargetError();

      const { data, error } = await supabase
        .from("tickets")
        .select(
          "id, space_id, categories(name), building:buildings(name), spaces(name, floor, buildings(name))",
        )
        .eq("id", delivery.ticketId)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      const ticket = data as unknown as JsonRecord;
      const category = firstRelation(ticket.categories);
      const space = ticket.space_id ? firstRelation(ticket.spaces) : null;
      const building = space ? firstRelation(space.buildings) : firstRelation(ticket.building);
      const categoryName = String(category.name ?? "未知類別");
      const buildingName = String(building.name ?? "");
      const spaceLabel = space
        ? `${String(space.name ?? "未知空間")}${
            typeof space.floor === "number" ? ` (${space.floor}F)` : ""
          }`
        : "";
      const location = [buildingName, spaceLabel].filter(Boolean).join(" - ");

      return {
        ticketId: String(ticket.id),
        webhookUrl,
        categoryName,
        location,
        updatedAt: delivery.eventAt,
      } satisfies TicketSocialDisplayData;
    },

    async markSent(deliveryId, messageId, sentAt) {
      const { error } = await supabase
        .from("notification_log")
        .update({
          status: "sent",
          resend_message_id: messageId,
          last_error: null,
          sent_at: sentAt.toISOString(),
          next_attempt_at: null,
        })
        .eq("id", deliveryId)
        .eq("status", "sending");

      if (error) throw error;
    },

    async markFailed(deliveryId, message, failedAt, options) {
      const { error } = await supabase
        .from("notification_log")
        .update({
          status: "failed",
          last_error: message,
          next_attempt_at: options.nextAttemptAt ? options.nextAttemptAt.toISOString() : null,
          updated_at: failedAt.toISOString(),
        })
        .eq("id", deliveryId)
        .eq("status", "sending");

      if (error) throw error;
    },
  };
}

async function sendToDiscord(message: { webhookUrl: string; content: string; allowedMentions: { parse: [] } }): Promise<{
  messageId: string;
}> {
  let response: Response;
  try {
    response = await fetch(message.webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: message.content,
        allowed_mentions: message.allowedMentions,
      }),
      signal: AbortSignal.timeout(10000),
    });
  } catch (error) {
    throw new DiscordSendError(error instanceof Error ? error.message : String(error), { retryable: true });
  }

  if (!response.ok) {
    throw new DiscordSendError(`Discord HTTP ${response.status}`, {
      retryable: response.status === 429 || response.status >= 500,
    });
  }

  return { messageId: "discord-webhook" };
}

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const serviceKey = readServiceKey();

const dependencies: RequestHandlerDependencies = {
  expectedSecret: Deno.env.get("REPAIRHUB_EDGE_FUNCTION_SECRET") ?? "",
  appBaseUrl: Deno.env.get("APP_BASE_URL") ?? "",
  repository: createRepository(supabaseUrl, serviceKey),
  sender: { send: sendToDiscord } satisfies DiscordSender,
};

Deno.serve(createRequestHandler(dependencies));
