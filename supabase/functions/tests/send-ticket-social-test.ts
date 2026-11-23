import assert from "node:assert/strict";
import test from "node:test";

import {
  createRequestHandler,
  type DiscordMessage,
  DiscordSendError,
  MissingSocialTargetError,
  type NotificationRepository,
  type RequestHandlerDependencies,
  SERVICE_SECRET_HEADER,
} from "../send-ticket-social/handler.ts";

const SERVICE_SECRET = "test-service-secret";
const FIXED_NOW = new Date("2026-11-23T08:30:00.000Z");

function createDelivery(overrides: Record<string, unknown> = {}) {
  return {
    id: "delivery-1",
    ticketId: "12345678-1234-1234-1234-123456789abc",
    eventType: "report_submitted",
    eventKey: "ticket:12345678-1234-1234-1234-123456789abc:report_submitted",
    targetFingerprint: "target-fingerprint",
    eventAt: "2026-11-23T08:30:00.000Z",
    attemptCount: 1,
    ...overrides,
  };
}

function createRepository(
  options: { ticketFound?: boolean; targetFound?: boolean; claim?: Record<string, unknown> } = {},
) {
  const state = {
    claim: (options.claim ?? createDelivery()) as object | null,
    ticketFound: options.ticketFound ?? true,
    targetFound: options.targetFound ?? true,
    sent: [] as Array<{ deliveryId: string; messageId: string }>,
    failed: [] as Array<{
      deliveryId: string;
      error: string;
      retryable: boolean;
      nextAttemptAt: Date | null;
    }>,
  };

  const repository: NotificationRepository = {
    claimDelivery() {
      return Promise.resolve(state.claim as never);
    },
    getTicketData(delivery) {
      if (!state.targetFound) return Promise.reject(new MissingSocialTargetError());
      if (!state.ticketFound) return Promise.resolve(null);

      return Promise.resolve({
        ticketId: delivery.ticketId,
        webhookUrl: "https://discord.com/api/webhooks/123/fake-token",
        categoryName: "空調",
        location: "行政大樓 3F 301",
        updatedAt: delivery.eventAt,
      });
    },
    markSent(deliveryId, messageId) {
      state.sent.push({ deliveryId, messageId });
      return Promise.resolve();
    },
    markFailed(deliveryId, error, _failedAt, options) {
      state.failed.push({
        deliveryId,
        error,
        retryable: options.retryable,
        nextAttemptAt: options.nextAttemptAt,
      });
      return Promise.resolve();
    },
  };

  return { repository, state };
}

function createTestHandler(
  repository: NotificationRepository,
  sender: RequestHandlerDependencies["sender"],
  overrides: Partial<RequestHandlerDependencies> = {},
) {
  return createRequestHandler({
    expectedSecret: SERVICE_SECRET,
    appBaseUrl: "https://repairhub.monyu.dev",
    repository,
    sender,
    now: () => FIXED_NOW,
    sleep: () => Promise.resolve(),
    random: () => 0.25,
    ...overrides,
  });
}

function request(deliveryId = "delivery-1", secret = SERVICE_SECRET) {
  return new Request("https://repairhub.monyu.dev/functions/v1/send-ticket-social", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      [SERVICE_SECRET_HEADER]: secret,
    },
    body: JSON.stringify({ delivery_id: deliveryId }),
  });
}

const successfulSender = (): Promise<{ messageId: string }> => Promise.resolve({ messageId: "discord-message-success" });

test("requires the internal service secret", async () => {
  const { repository } = createRepository();
  const handler = createTestHandler(repository, { send: successfulSender });

  const unauthorized = await handler(request("delivery-1", "wrong-secret"));
  assert.equal(unauthorized.status, 401);
});

test("claims the social delivery and posts concise zh-TW plain text with mentions disabled", async () => {
  const { repository, state } = createRepository();
  const messages: DiscordMessage[] = [];
  const handler = createTestHandler(repository, {
    send(message) {
      messages.push(message);
      return Promise.resolve({ messageId: "discord-message-1" });
    },
  });

  const response = await handler(request());
  const body = (await response.json()) as Record<string, unknown>;

  assert.equal(response.status, 200);
  assert.equal(body.success, true);
  assert.equal(messages.length, 1);
  assert.equal(messages[0]?.webhookUrl, "https://discord.com/api/webhooks/123/fake-token");
  assert.deepEqual(messages[0]?.allowedMentions, { parse: [] });
  assert.equal(
    messages[0]?.content,
    [
      "報修單編號：#12345678",
      "狀態：待處理",
      "類別：空調",
      "地點：行政大樓 3F 301",
      "更新時間：2026/11/23 16:30",
      "追蹤連結：https://repairhub.monyu.dev/track/12345678-1234-1234-1234-123456789abc",
    ].join("\n"),
  );
  assert.deepEqual(state.sent, [{ deliveryId: "delivery-1", messageId: "discord-message-1" }]);
});

test("accepts new_ticket social deliveries with the same concise format", async () => {
  const { repository } = createRepository({
    claim: createDelivery({ eventType: "new_ticket" }),
  });
  const messages: DiscordMessage[] = [];
  const handler = createTestHandler(repository, {
    send(message) {
      messages.push(message);
      return Promise.resolve({ messageId: "discord-message-new-ticket" });
    },
  });

  const response = await handler(request());

  assert.equal(response.status, 200);
  assert.equal(messages.length, 1);
  assert.equal(messages[0]?.content.split("\n")[1], "狀態：待處理");
});

test("marks a missing active target as a permanent failure without sending", async () => {
  const { repository, state } = createRepository({ targetFound: false });
  let senderCalls = 0;
  const handler = createTestHandler(repository, {
    send() {
      senderCalls++;
      return Promise.resolve({ messageId: "unexpected" });
    },
  });

  const response = await handler(request());

  assert.equal(response.status, 422);
  assert.equal(senderCalls, 0);
  assert.deepEqual(state.failed, [{
    deliveryId: "delivery-1",
    error: "No active social target",
    retryable: false,
    nextAttemptAt: null,
  }]);
});

test("retries network errors, 429, and 5xx; does not retry other 4xx", async () => {
  const { repository } = createRepository();
  const outcomes = [
    new DiscordSendError("network unavailable", { retryable: true }),
    new DiscordSendError("rate limited", { retryable: true }),
    new DiscordSendError("webhook removed", { retryable: false }),
  ];
  const handler = createTestHandler(repository, {
    send() {
      const outcome = outcomes.shift();
      if (outcome instanceof Error) return Promise.reject(outcome);
      return Promise.resolve({ messageId: "unexpected" });
    },
  });

  const response = await handler(request());

  assert.equal(response.status, 502);
  assert.equal(outcomes.length, 0);
});

test("completes a successful social delivery after a retryable failure", async () => {
  const { repository, state } = createRepository();
  let senderCalls = 0;
  const handler = createTestHandler(repository, {
    send() {
      senderCalls++;
      if (senderCalls === 1) {
        return Promise.reject(new DiscordSendError("rate limited", { retryable: true }));
      }
      return Promise.resolve({ messageId: "discord-message-after-retry" });
    },
  });

  const response = await handler(request());

  assert.equal(response.status, 200);
  assert.deepEqual(state.sent, [{ deliveryId: "delivery-1", messageId: "discord-message-after-retry" }]);
});
