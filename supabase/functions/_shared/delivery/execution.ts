import { isTicketNotificationEvent, type TicketNotificationEvent } from "./events.ts";

export const SERVICE_SECRET_HEADER = "x-repairhub-service-secret";

const MAX_IMMEDIATE_ATTEMPTS = 3;
const MAX_DELIVERY_ATTEMPTS = 5;
const PERSISTENT_RETRY_DELAYS_MINUTES = [5, 15, 60, 360] as const;

export interface ClaimedDelivery {
  id: string;
  ticketId: string;
  eventType: string;
  eventKey: string;
  eventAt: string;
  attemptCount: number;
}

export interface TicketDisplayData {
  ticketId: string;
}

export interface DeliveryRepository<TDelivery extends ClaimedDelivery, TTicketData extends TicketDisplayData> {
  claimDelivery(deliveryId: string, now: Date): Promise<TDelivery | null>;
  getTicketData(delivery: TDelivery): Promise<TTicketData | null>;
  markSent(deliveryId: string, messageId: string, now: Date): Promise<void>;
  markFailed(
    deliveryId: string,
    error: string,
    now: Date,
    failure: { retryable: boolean; nextAttemptAt: Date | null },
  ): Promise<void>;
}

export interface DeliverySender<TMessage> {
  send(message: TMessage): Promise<{ messageId: string }>;
}

export class DeliverySendError extends Error {
  readonly retryable: boolean;

  constructor(message: string, options: { retryable: boolean }) {
    super(message);
    this.name = "DeliverySendError";
    this.retryable = options.retryable;
  }
}

export interface ChannelFailure {
  status: number;
  error: string;
  logError?: string;
}

export interface DeliveryChannel<TDelivery extends ClaimedDelivery, TTicketData extends TicketDisplayData, TMessage> {
  name: string;
  renderError: string;
  validateTarget(delivery: TDelivery): ChannelFailure | null;
  readFailure(error: unknown): ChannelFailure | null;
  buildMessage(
    delivery: TDelivery,
    ticketData: TTicketData,
    trackingUrl: string,
    eventType: TicketNotificationEvent,
  ): TMessage;
}

export interface RequestHandlerDependencies<
  TDelivery extends ClaimedDelivery,
  TTicketData extends TicketDisplayData,
  TMessage,
> {
  expectedSecret: string;
  appBaseUrl: string;
  repository: DeliveryRepository<TDelivery, TTicketData>;
  sender: DeliverySender<TMessage>;
  channel: DeliveryChannel<TDelivery, TTicketData, TMessage>;
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
  if (!provided || !expected || provided.length !== expected.length) return false;

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
  if (error instanceof DeliverySendError) {
    return { message: error.message, retryable: error.retryable };
  }
  return { message: errorMessage(error), retryable: true };
}

function nextPersistentAttempt(attemptCount: number, failedAt: Date, retryable: boolean): Date | null {
  if (!retryable || attemptCount < 1 || attemptCount >= MAX_DELIVERY_ATTEMPTS) return null;

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
  if (baseUrl.protocol !== "https:") throw new Error("APP_BASE_URL must use HTTPS.");

  return new URL(`/track/${encodeURIComponent(ticketId)}`, baseUrl).toString();
}

export function createRequestHandler<
  TDelivery extends ClaimedDelivery,
  TTicketData extends TicketDisplayData,
  TMessage,
>(
  dependencies: RequestHandlerDependencies<TDelivery, TTicketData, TMessage>,
) {
  const now = dependencies.now ?? (() => new Date());
  const sleep = dependencies.sleep ?? defaultSleep;
  const random = dependencies.random ?? Math.random;

  return async (request: Request): Promise<Response> => {
    if (request.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);
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
    let delivery: TDelivery | null;
    try {
      delivery = await dependencies.repository.claimDelivery(deliveryId, now());
    } catch (error) {
      console.error("Failed to claim notification delivery:", error);
      return jsonResponse({ error: "Failed to claim delivery" }, 500);
    }
    if (!delivery) return jsonResponse({ success: true, skipped: "already_claimed_or_sent" }, 200);

    const permanentFailure = async (failure: ChannelFailure): Promise<Response> => {
      await dependencies.repository.markFailed(delivery.id, failure.logError ?? failure.error, now(), {
        retryable: false,
        nextAttemptAt: null,
      });
      return jsonResponse({ error: failure.error }, failure.status);
    };

    const targetFailure = dependencies.channel.validateTarget(delivery);
    if (targetFailure) return permanentFailure(targetFailure);

    const eventType = delivery.eventType;
    if (!isTicketNotificationEvent(eventType)) {
      return permanentFailure({
        status: 422,
        error: "Unsupported event type",
        logError: `Unsupported event: ${eventType}`,
      });
    }

    let ticketData: TTicketData | null;
    try {
      ticketData = await dependencies.repository.getTicketData(delivery);
    } catch (error) {
      const channelFailure = dependencies.channel.readFailure(error);
      if (channelFailure) return permanentFailure(channelFailure);

      const failedAt = now();
      await dependencies.repository.markFailed(delivery.id, errorMessage(error), failedAt, {
        retryable: true,
        nextAttemptAt: nextPersistentAttempt(delivery.attemptCount, failedAt, true),
      });
      return jsonResponse({ error: "Failed to load Ticket data" }, 500);
    }
    if (!ticketData) return permanentFailure({ status: 404, error: "Ticket not found" });

    let message: TMessage;
    try {
      message = dependencies.channel.buildMessage(
        delivery,
        ticketData,
        buildTrackingUrl(dependencies.appBaseUrl, ticketData.ticketId),
        eventType,
      );
    } catch (error) {
      return permanentFailure({
        status: 500,
        error: dependencies.channel.renderError,
        logError: errorMessage(error),
      });
    }

    let lastFailure = { message: `${dependencies.channel.name} send failed`, retryable: true };
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
      error: `${dependencies.channel.name} send failed`,
      delivery_id: delivery.id,
      retryable: lastFailure.retryable,
    }, 502);
  };
}
