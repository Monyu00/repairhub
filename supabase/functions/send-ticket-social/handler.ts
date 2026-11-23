export const SERVICE_SECRET_HEADER = "x-repairhub-service-secret";

const MAX_IMMEDIATE_ATTEMPTS = 3;
const MAX_DELIVERY_ATTEMPTS = 5;
const PERSISTENT_RETRY_DELAYS_MINUTES = [5, 15, 60, 360] as const;

export interface ClaimedSocialDelivery {
  id: string;
  ticketId: string;
  eventType: string;
  eventKey: string;
  targetFingerprint: string;
  eventAt: string;
  attemptCount: number;
}

export interface TicketSocialDisplayData {
  ticketId: string;
  webhookUrl: string;
  categoryName: string;
  location: string;
  updatedAt: string;
}

export interface DiscordMessage {
  webhookUrl: string;
  content: string;
  allowedMentions: { parse: [] };
}

export interface NotificationRepository {
  claimDelivery(deliveryId: string, now: Date): Promise<ClaimedSocialDelivery | null>;
  getTicketData(delivery: ClaimedSocialDelivery): Promise<TicketSocialDisplayData | null>;
  markSent(deliveryId: string, messageId: string, now: Date): Promise<void>;
  markFailed(
    deliveryId: string,
    error: string,
    now: Date,
    failure: { retryable: boolean; nextAttemptAt: Date | null },
  ): Promise<void>;
}

export interface DiscordSender {
  send(message: DiscordMessage): Promise<{ messageId: string }>;
}

export class DiscordSendError extends Error {
  readonly retryable: boolean;

  constructor(message: string, options: { retryable: boolean }) {
    super(message);
    this.name = "DiscordSendError";
    this.retryable = options.retryable;
  }
}

export class MissingSocialTargetError extends Error {
  constructor() {
    super("No active social target");
    this.name = "MissingSocialTargetError";
  }
}

export interface RequestHandlerDependencies {
  expectedSecret: string;
  appBaseUrl: string;
  repository: NotificationRepository;
  sender: DiscordSender;
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
  if (error instanceof DiscordSendError) {
    return { message: error.message, retryable: error.retryable };
  }
  return { message: errorMessage(error), retryable: true };
}

function nextPersistentAttempt(attemptCount: number, failedAt: Date, retryable: boolean): Date | null {
  if (!retryable || attemptCount < 1 || attemptCount >= MAX_DELIVERY_ATTEMPTS) {
    return null;
  }

  const delayMinutes = PERSISTENT_RETRY_DELAYS_MINUTES[attemptCount - 1];
  return new Date(failedAt.getTime() + delayMinutes * 60_000);
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

function renderDiscordMessage(ticket: TicketSocialDisplayData, trackingUrl: string): string {
  return [
    `報修單編號：#${ticket.ticketId.slice(0, 8)}`,
    "狀態：待處理",
    `類別：${ticket.categoryName}`,
    `地點：${ticket.location}`,
    `更新時間：${new Intl.DateTimeFormat("zh-TW", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
      timeZone: "Asia/Taipei",
    }).format(new Date(ticket.updatedAt))}`,
    `追蹤連結：${trackingUrl}`,
  ].join("\n");
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
    let delivery: ClaimedSocialDelivery | null;
    try {
      delivery = await dependencies.repository.claimDelivery(deliveryId, now());
    } catch (error) {
      console.error("Failed to claim social delivery:", error);
      return jsonResponse({ error: "Failed to claim delivery" }, 500);
    }
    if (!delivery) {
      return jsonResponse({ success: true, skipped: "already_claimed_or_sent" }, 200);
    }
    if (delivery.eventType !== "report_submitted") {
      await dependencies.repository.markFailed(delivery.id, `Unsupported event: ${delivery.eventType}`, now(), {
        retryable: false,
        nextAttemptAt: null,
      });
      return jsonResponse({ error: "Unsupported event type" }, 422);
    }

    let ticketData: TicketSocialDisplayData | null;
    try {
      ticketData = await dependencies.repository.getTicketData(delivery);
    } catch (error) {
      if (error instanceof MissingSocialTargetError) {
        await dependencies.repository.markFailed(delivery.id, error.message, now(), {
          retryable: false,
          nextAttemptAt: null,
        });
        return jsonResponse({ error: "Missing social target" }, 422);
      }
      const failedAt = now();
      await dependencies.repository.markFailed(delivery.id, errorMessage(error), failedAt, {
        retryable: true,
        nextAttemptAt: nextPersistentAttempt(delivery.attemptCount, failedAt, true),
      });
      return jsonResponse({ error: "Failed to load Ticket data" }, 500);
    }
    if (!ticketData) {
      await dependencies.repository.markFailed(delivery.id, "Ticket not found", now(), {
        retryable: false,
        nextAttemptAt: null,
      });
      return jsonResponse({ error: "Ticket not found" }, 404);
    }

    let message: DiscordMessage;
    try {
      message = {
        webhookUrl: ticketData.webhookUrl,
        content: renderDiscordMessage(ticketData, buildTrackingUrl(dependencies.appBaseUrl, ticketData.ticketId)),
        allowedMentions: { parse: [] },
      };
    } catch (error) {
      await dependencies.repository.markFailed(delivery.id, errorMessage(error), now(), {
        retryable: false,
        nextAttemptAt: null,
      });
      return jsonResponse({ error: "Failed to render Discord message" }, 500);
    }

    let lastFailure = { message: "Discord send failed", retryable: true };
    for (let attempt = 0; attempt < MAX_IMMEDIATE_ATTEMPTS; attempt++) {
      try {
        const result = await dependencies.sender.send(message);
        await dependencies.repository.markSent(delivery.id, result.messageId, now());
        return jsonResponse({ success: true, message_id: result.messageId }, 200);
      } catch (error) {
        lastFailure = toSendFailure(error);
        if (!lastFailure.retryable || attempt === MAX_IMMEDIATE_ATTEMPTS - 1) break;
        await sleep(1000 * 2 ** attempt + Math.floor(random() * 250));
      }
    }

    const failedAt = now();
    await dependencies.repository.markFailed(delivery.id, lastFailure.message, failedAt, {
      retryable: lastFailure.retryable,
      nextAttemptAt: nextPersistentAttempt(delivery.attemptCount, failedAt, lastFailure.retryable),
    });
    return jsonResponse({
      error: "Discord send failed",
      delivery_id: delivery.id,
      retryable: lastFailure.retryable,
    }, 502);
  };
}
