import { renderTicketEmail, type TicketEmailData, type TicketNotificationEvent } from "./templates.ts";

export const SERVICE_SECRET_HEADER = "x-repairhub-service-secret";

const MAX_IMMEDIATE_ATTEMPTS = 3;
const SUPPORTED_EVENT_TYPES = ["in_progress", "completed", "closed"] as const;

export type TicketEmailDisplayData = Omit<TicketEmailData, "trackingUrl">;

export interface ClaimedDelivery {
  id: string;
  ticketId: string;
  eventType: string;
  eventKey: string;
  recipientEmail: string;
  eventAt: string;
}

export interface EmailMessage {
  from: string;
  replyTo: string;
  to: string;
  subject: string;
  html: string;
  text: string;
  idempotencyKey: string;
}

export interface NotificationRepository {
  claimDelivery(deliveryId: string, now: Date): Promise<ClaimedDelivery | null>;
  getTicketData(delivery: ClaimedDelivery): Promise<TicketEmailDisplayData | null>;
  markSent(deliveryId: string, messageId: string, now: Date): Promise<void>;
  markFailed(deliveryId: string, error: string, now: Date): Promise<void>;
}

export interface EmailSender {
  send(message: EmailMessage): Promise<{ messageId: string }>;
}

export class EmailSendError extends Error {
  readonly retryable: boolean;

  constructor(message: string, options: { retryable: boolean }) {
    super(message);
    this.name = "EmailSendError";
    this.retryable = options.retryable;
  }
}

export interface RequestHandlerDependencies {
  expectedSecret: string;
  from: string;
  replyTo: string;
  appBaseUrl: string;
  repository: NotificationRepository;
  sender: EmailSender;
  now?: () => Date;
  sleep?: (milliseconds: number) => Promise<void>;
  random?: () => number;
}

function jsonResponse(body: Record<string, unknown>, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function secretsMatch(provided: string | null, expected: string): boolean {
  if (!provided || !expected || provided.length !== expected.length) {
    return false;
  }

  let difference = 0;
  for (let index = 0; index < provided.length; index++) {
    difference |= provided.charCodeAt(index) ^ expected.charCodeAt(index);
  }

  return difference === 0;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function toSendFailure(error: unknown): { message: string; retryable: boolean } {
  if (error instanceof EmailSendError) {
    return { message: error.message, retryable: error.retryable };
  }

  return { message: errorMessage(error), retryable: true };
}

function isTicketNotificationEvent(value: string): value is TicketNotificationEvent {
  return (SUPPORTED_EVENT_TYPES as readonly string[]).includes(value);
}

function defaultSleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function buildTrackingUrl(appBaseUrl: string, ticketId: string): string {
  let baseUrl: URL;

  try {
    baseUrl = new URL(appBaseUrl);
  } catch {
    throw new Error("APP_BASE_URL is not a valid URL.");
  }

  if (baseUrl.protocol !== "https:") {
    throw new Error("APP_BASE_URL must use HTTPS.");
  }

  return new URL(`/track/${encodeURIComponent(ticketId)}`, baseUrl).toString();
}

export function createRequestHandler(dependencies: RequestHandlerDependencies) {
  const now = dependencies.now ?? (() => new Date());
  const sleep = dependencies.sleep ?? defaultSleep;
  const random = dependencies.random ?? Math.random;

  return async (request: Request): Promise<Response> => {
    if (request.method !== "POST") {
      return jsonResponse({ error: "Method not allowed" }, 405);
    }

    if (!secretsMatch(request.headers.get(SERVICE_SECRET_HEADER), dependencies.expectedSecret)) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    let payload: unknown;
    try {
      payload = await request.json();
    } catch {
      return jsonResponse({ error: "Invalid JSON body" }, 400);
    }

    if (
      typeof payload !== "object" ||
      payload === null ||
      typeof (payload as { delivery_id?: unknown }).delivery_id !== "string"
    ) {
      return jsonResponse({ error: "Missing delivery_id" }, 400);
    }

    const deliveryId = (payload as { delivery_id: string }).delivery_id;

    let delivery: ClaimedDelivery | null;
    try {
      delivery = await dependencies.repository.claimDelivery(deliveryId, now());
    } catch (error) {
      console.error("Failed to claim notification delivery:", error);
      return jsonResponse({ error: "Failed to claim delivery" }, 500);
    }

    if (!delivery) {
      return jsonResponse({ success: true, skipped: "already_claimed_or_sent" }, 200);
    }

    let ticketData: TicketEmailDisplayData | null;
    try {
      ticketData = await dependencies.repository.getTicketData(delivery);
    } catch (error) {
      await dependencies.repository.markFailed(delivery.id, errorMessage(error), now());
      return jsonResponse({ error: "Failed to load Ticket data" }, 500);
    }

    if (!ticketData) {
      await dependencies.repository.markFailed(delivery.id, "Ticket not found", now());
      return jsonResponse({ error: "Ticket not found" }, 404);
    }

    if (!isTicketNotificationEvent(delivery.eventType)) {
      await dependencies.repository.markFailed(delivery.id, `Unsupported event: ${delivery.eventType}`, now());
      return jsonResponse({ error: "Unsupported event type" }, 422);
    }

    let email: EmailMessage;
    try {
      const rendered = renderTicketEmail(
        {
          ...ticketData,
          trackingUrl: buildTrackingUrl(dependencies.appBaseUrl, ticketData.ticketId),
        },
        delivery.eventType,
      );

      email = {
        from: dependencies.from,
        replyTo: dependencies.replyTo,
        to: delivery.recipientEmail,
        ...rendered,
        idempotencyKey: `repairhub:${delivery.eventKey}`,
      };
    } catch (error) {
      await dependencies.repository.markFailed(delivery.id, errorMessage(error), now());
      return jsonResponse({ error: "Failed to render Email" }, 500);
    }

    let lastFailure = { message: "Email send failed", retryable: true };

    for (let attempt = 0; attempt < MAX_IMMEDIATE_ATTEMPTS; attempt++) {
      try {
        const result = await dependencies.sender.send(email);
        await dependencies.repository.markSent(delivery.id, result.messageId, now());
        return jsonResponse({ success: true, message_id: result.messageId }, 200);
      } catch (error) {
        lastFailure = toSendFailure(error);

        if (!lastFailure.retryable || attempt === MAX_IMMEDIATE_ATTEMPTS - 1) {
          break;
        }

        const exponentialDelay = 1000 * 2 ** attempt;
        await sleep(exponentialDelay + Math.floor(random() * 250));
      }
    }

    await dependencies.repository.markFailed(delivery.id, lastFailure.message, now());

    return jsonResponse(
      {
        error: "Email send failed",
        delivery_id: delivery.id,
        retryable: lastFailure.retryable,
      },
      502,
    );
  };
}
