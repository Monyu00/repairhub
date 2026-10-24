/// <reference lib="deno.ns" />

import { createClient } from "@supabase/supabase-js";

import {
  createRequestHandler,
  type EmailMessage,
  EmailSendError,
  type NotificationRepository,
  type RequestHandlerDependencies,
  type TicketEmailDisplayData,
} from "./handler.ts";
import { ticketStatusLabel } from "./templates.ts";

type JsonRecord = Record<string, unknown>;

function firstRelation(value: unknown): JsonRecord {
  if (Array.isArray(value)) {
    return (value[0] ?? {}) as JsonRecord;
  }

  return (value ?? {}) as JsonRecord;
}

function readServiceKey(): string {
  const legacyServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (legacyServiceRoleKey) {
    return legacyServiceRoleKey;
  }

  const secretKeys = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (!secretKeys) {
    return "";
  }

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
        .rpc("claim_notification_delivery", { p_delivery_id: deliveryId })
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      const row = data as JsonRecord;
      return {
        id: String(row.id),
        ticketId: String(row.ticket_id),
        eventType: String(row.event_type),
        eventKey: String(row.event_key),
        recipientEmail: String(row.recipient_email),
        eventAt: String(row.event_at),
      };
    },

    async getTicketData(delivery) {
      const { data, error } = await supabase
        .from("tickets")
        .select("id, categories(name), spaces(name, floor, buildings(name))")
        .eq("id", delivery.ticketId)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      const ticket = data as unknown as JsonRecord;
      const category = firstRelation(ticket.categories);
      const space = firstRelation(ticket.spaces);
      const building = firstRelation(space.buildings);
      const categoryName = String(category.name ?? "未知類別");
      const spaceName = String(space.name ?? "未知地點");
      const buildingName = String(building.name ?? "");
      const floor = typeof space.floor === "number" ? ` (${space.floor}F)` : "";
      const location = [buildingName, `${spaceName}${floor}`].filter(Boolean).join(" ");

      return {
        ticketId: String(ticket.id),
        statusLabel: ticketStatusLabel(delivery.eventType),
        categoryName,
        location,
        updatedAt: delivery.eventAt,
      } satisfies TicketEmailDisplayData;
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

    async markFailed(deliveryId, message, failedAt) {
      const { error } = await supabase
        .from("notification_log")
        .update({
          status: "failed",
          last_error: message,
          next_attempt_at: null,
          updated_at: failedAt.toISOString(),
        })
        .eq("id", deliveryId)
        .eq("status", "sending");

      if (error) throw error;
    },
  };
}

async function sendWithResend(message: EmailMessage): Promise<{ messageId: string }> {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  if (!apiKey) {
    throw new EmailSendError("RESEND_API_KEY is not configured.", { retryable: false });
  }

  let response: Response;
  try {
    response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": message.idempotencyKey,
      },
      body: JSON.stringify({
        from: message.from,
        to: [message.to],
        reply_to: message.replyTo,
        subject: message.subject,
        html: message.html,
        text: message.text,
      }),
      signal: AbortSignal.timeout(10000),
    });
  } catch (error) {
    throw new EmailSendError(error instanceof Error ? error.message : String(error), { retryable: true });
  }

  const responseText = await response.text();
  let responseBody: JsonRecord = {};

  try {
    responseBody = JSON.parse(responseText) as JsonRecord;
  } catch {
    responseBody = { message: responseText };
  }

  if (!response.ok) {
    throw new EmailSendError(
      `Resend HTTP ${response.status}: ${String(responseBody.message ?? responseBody.error ?? "Unknown error")}`,
      {
        retryable: response.status === 429 || response.status >= 500,
      },
    );
  }

  if (typeof responseBody.id !== "string" || !responseBody.id) {
    throw new EmailSendError("Resend response did not contain a message ID.", { retryable: false });
  }

  return { messageId: responseBody.id };
}

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const serviceKey = readServiceKey();

const dependencies: RequestHandlerDependencies = {
  expectedSecret: Deno.env.get("REPAIRHUB_EDGE_FUNCTION_SECRET") ?? "",
  from: Deno.env.get("RESEND_FROM") ?? "",
  replyTo: Deno.env.get("RESEND_REPLY_TO") ?? "",
  appBaseUrl: Deno.env.get("APP_BASE_URL") ?? "",
  repository: createRepository(supabaseUrl, serviceKey),
  sender: { send: sendWithResend },
};

Deno.serve(createRequestHandler(dependencies));
