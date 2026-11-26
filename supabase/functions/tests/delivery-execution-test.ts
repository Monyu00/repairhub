import assert from "node:assert/strict";
import test from "node:test";

import {
  type ClaimedDelivery,
  createRequestHandler,
  type DeliveryChannel,
  type DeliveryRepository,
  type DeliverySender,
  DeliverySendError,
  SERVICE_SECRET_HEADER,
} from "../_shared/delivery/execution.ts";

const SERVICE_SECRET = "test-service-secret";
const FIXED_NOW = new Date("2026-10-23T08:30:00.000Z");

interface TestDelivery extends ClaimedDelivery {
  target: string;
}

interface TestTicket {
  ticketId: string;
  categoryName: string;
}

interface TestMessage {
  target: string;
  content: string;
  trackingUrl: string;
}

function createDelivery(overrides: Partial<TestDelivery> = {}): TestDelivery {
  return {
    id: "delivery-1",
    ticketId: "12345678-1234-1234-1234-123456789abc",
    eventType: "in_progress",
    eventKey: "ticket:12345678-1234-1234-1234-123456789abc:in_progress:1761208200",
    eventAt: "2026-10-23T08:30:00.000Z",
    attemptCount: 1,
    target: "target-1",
    ...overrides,
  };
}

function createRepository() {
  const state = {
    claim: createDelivery() as TestDelivery | null,
    claimError: null as Error | null,
    claimCalls: 0,
    ticket: {
      ticketId: createDelivery().ticketId,
      categoryName: "空調",
    } as TestTicket | null,
    readError: null as Error | null,
    readCalls: 0,
    sent: [] as Array<{ deliveryId: string; messageId: string }>,
    failed: [] as Array<{
      deliveryId: string;
      error: string;
      retryable: boolean;
      nextAttemptAt: Date | null;
    }>,
  };

  const repository: DeliveryRepository<TestDelivery, TestTicket> = {
    claimDelivery() {
      state.claimCalls++;
      if (state.claimError) return Promise.reject(state.claimError);
      return Promise.resolve(state.claim);
    },
    getTicketData() {
      state.readCalls++;
      if (state.readError) return Promise.reject(state.readError);
      return Promise.resolve(state.ticket);
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

function createChannel(
  overrides: Partial<DeliveryChannel<TestDelivery, TestTicket, TestMessage>> = {},
): DeliveryChannel<TestDelivery, TestTicket, TestMessage> {
  return {
    name: "Test",
    renderError: "Failed to render Test message",
    validateTarget: () => null,
    readFailure: () => null,
    buildMessage: (delivery, ticketData, trackingUrl) => ({
      target: delivery.target,
      content: ticketData.categoryName,
      trackingUrl,
    }),
    ...overrides,
  };
}

function createTestHandler(
  repository: DeliveryRepository<TestDelivery, TestTicket>,
  sender: DeliverySender<TestMessage>,
  channel = createChannel(),
  overrides: { appBaseUrl?: string; sleeps?: number[] } = {},
) {
  return createRequestHandler({
    expectedSecret: SERVICE_SECRET,
    appBaseUrl: overrides.appBaseUrl ?? "https://repairhub.monyu.dev",
    repository,
    sender,
    channel,
    now: () => FIXED_NOW,
    sleep: (milliseconds) => {
      overrides.sleeps?.push(milliseconds);
      return Promise.resolve();
    },
    random: () => 0.25,
  });
}

function request(
  options: { method?: string; secret?: string; body?: string } = {},
): Request {
  const method = options.method ?? "POST";
  return new Request("https://example.test/functions/v1/delivery", {
    method,
    headers: {
      "Content-Type": "application/json",
      [SERVICE_SECRET_HEADER]: options.secret ?? SERVICE_SECRET,
    },
    body: method === "GET" ? undefined : (options.body ?? JSON.stringify({ delivery_id: "delivery-1" })),
  });
}

const successfulSender: DeliverySender<TestMessage> = {
  send: () => Promise.resolve({ messageId: "message-1" }),
};

test("rejects invalid requests before claiming a Delivery", async () => {
  const { repository, state } = createRepository();
  let senderCalls = 0;
  const handler = createTestHandler(repository, {
    send() {
      senderCalls++;
      return Promise.resolve({ messageId: "unexpected" });
    },
  });

  const responses = await Promise.all([
    handler(request({ method: "GET" })),
    handler(request({ secret: "wrong-secret" })),
    handler(request({ body: "{" })),
    handler(request({ body: JSON.stringify({}) })),
  ]);

  assert.deepEqual(responses.map((response) => response.status), [405, 401, 400, 400]);
  assert.equal(state.claimCalls, 0);
  assert.equal(senderCalls, 0);
});

test("returns the existing claim failure and skip responses", async () => {
  const { repository, state } = createRepository();
  const handler = createTestHandler(repository, successfulSender);

  state.claimError = new Error("database unavailable");
  const failedClaim = await handler(request());
  assert.equal(failedClaim.status, 500);
  assert.deepEqual(await failedClaim.json(), { error: "Failed to claim delivery" });

  state.claimError = null;
  state.claim = null;
  const skipped = await handler(request());
  assert.equal(skipped.status, 200);
  assert.deepEqual(await skipped.json(), { success: true, skipped: "already_claimed_or_sent" });
  assert.deepEqual(state.failed, []);
});

test("maps channel target validation to a permanent Delivery failure", async () => {
  const { repository, state } = createRepository();
  let senderCalls = 0;
  const handler = createTestHandler(
    repository,
    {
      send() {
        senderCalls++;
        return Promise.resolve({ messageId: "unexpected" });
      },
    },
    createChannel({
      validateTarget: () => ({ status: 422, error: "Invalid recipient Email" }),
    }),
  );

  const response = await handler(request());

  assert.equal(response.status, 422);
  assert.deepEqual(await response.json(), { error: "Invalid recipient Email" });
  assert.equal(state.readCalls, 0);
  assert.equal(senderCalls, 0);
  assert.deepEqual(state.failed, [{
    deliveryId: "delivery-1",
    error: "Invalid recipient Email",
    retryable: false,
    nextAttemptAt: null,
  }]);
});

test("fails an unsupported event permanently before reading Ticket data", async () => {
  const { repository, state } = createRepository();
  state.claim = createDelivery({ eventType: "unknown_event" });
  const handler = createTestHandler(repository, successfulSender);

  const response = await handler(request());

  assert.equal(response.status, 422);
  assert.deepEqual(await response.json(), { error: "Unsupported event type" });
  assert.equal(state.readCalls, 0);
  assert.deepEqual(state.failed, [{
    deliveryId: "delivery-1",
    error: "Unsupported event: unknown_event",
    retryable: false,
    nextAttemptAt: null,
  }]);
});

test("schedules a persistent retry for a Ticket repository read failure", async () => {
  const { repository, state } = createRepository();
  state.readError = new Error("ticket query failed");
  const handler = createTestHandler(repository, successfulSender);

  const response = await handler(request());

  assert.equal(response.status, 500);
  assert.deepEqual(await response.json(), { error: "Failed to load Ticket data" });
  assert.deepEqual(state.failed, [{
    deliveryId: "delivery-1",
    error: "ticket query failed",
    retryable: true,
    nextAttemptAt: new Date("2026-10-23T08:35:00.000Z"),
  }]);
});

test("maps a channel-specific Ticket read failure to its permanent response", async () => {
  const { repository, state } = createRepository();
  state.readError = new Error("No active social target");
  const handler = createTestHandler(
    repository,
    successfulSender,
    createChannel({
      readFailure: (error) =>
        error instanceof Error && error.message === "No active social target"
          ? { status: 422, error: "Missing social target", logError: error.message }
          : null,
    }),
  );

  const response = await handler(request());

  assert.equal(response.status, 422);
  assert.deepEqual(await response.json(), { error: "Missing social target" });
  assert.deepEqual(state.failed, [{
    deliveryId: "delivery-1",
    error: "No active social target",
    retryable: false,
    nextAttemptAt: null,
  }]);
});

test("fails permanently when the Ticket no longer exists", async () => {
  const { repository, state } = createRepository();
  state.ticket = null;
  const handler = createTestHandler(repository, successfulSender);

  const response = await handler(request());

  assert.equal(response.status, 404);
  assert.deepEqual(await response.json(), { error: "Ticket not found" });
  assert.deepEqual(state.failed, [{
    deliveryId: "delivery-1",
    error: "Ticket not found",
    retryable: false,
    nextAttemptAt: null,
  }]);
});

test("builds the shared tracking URL, sends once, and marks the Delivery sent", async () => {
  const { repository, state } = createRepository();
  const messages: TestMessage[] = [];
  const handler = createTestHandler(repository, {
    send(message) {
      messages.push(message);
      return Promise.resolve({ messageId: "message-1" });
    },
  });

  const response = await handler(request());

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { success: true, message_id: "message-1" });
  assert.deepEqual(messages, [{
    target: "target-1",
    content: "空調",
    trackingUrl: "https://repairhub.monyu.dev/track/12345678-1234-1234-1234-123456789abc",
  }]);
  assert.deepEqual(state.sent, [{ deliveryId: "delivery-1", messageId: "message-1" }]);
  assert.deepEqual(state.failed, []);
});

test("fails rendering permanently without calling the sender", async () => {
  const { repository, state } = createRepository();
  let senderCalls = 0;
  const handler = createTestHandler(
    repository,
    {
      send() {
        senderCalls++;
        return Promise.resolve({ messageId: "unexpected" });
      },
    },
    createChannel({
      buildMessage: () => {
        throw new Error("bad payload");
      },
    }),
  );

  const response = await handler(request());

  assert.equal(response.status, 500);
  assert.deepEqual(await response.json(), { error: "Failed to render Test message" });
  assert.equal(senderCalls, 0);
  assert.deepEqual(state.failed, [{
    deliveryId: "delivery-1",
    error: "bad payload",
    retryable: false,
    nextAttemptAt: null,
  }]);
});

test("treats an invalid application base URL as a permanent rendering failure", async () => {
  const { repository, state } = createRepository();
  const handler = createTestHandler(repository, successfulSender, createChannel(), {
    appBaseUrl: "http://repairhub.monyu.dev",
  });

  const response = await handler(request());

  assert.equal(response.status, 500);
  assert.deepEqual(state.failed, [{
    deliveryId: "delivery-1",
    error: "APP_BASE_URL must use HTTPS.",
    retryable: false,
    nextAttemptAt: null,
  }]);
});

test("does not retry a permanent sender failure or schedule another attempt", async () => {
  const { repository, state } = createRepository();
  let senderCalls = 0;
  const handler = createTestHandler(repository, {
    send() {
      senderCalls++;
      return Promise.reject(new DeliverySendError("invalid recipient", { retryable: false }));
    },
  });

  const response = await handler(request());

  assert.equal(response.status, 502);
  assert.deepEqual(await response.json(), {
    error: "Test send failed",
    delivery_id: "delivery-1",
    retryable: false,
  });
  assert.equal(senderCalls, 1);
  assert.deepEqual(state.failed, [{
    deliveryId: "delivery-1",
    error: "invalid recipient",
    retryable: false,
    nextAttemptAt: null,
  }]);
});

test("uses three jittered immediate attempts before scheduling a persistent retry", async () => {
  const { repository, state } = createRepository();
  const sleeps: number[] = [];
  let senderCalls = 0;
  const handler = createTestHandler(
    repository,
    {
      send() {
        senderCalls++;
        return Promise.reject(new DeliverySendError("upstream unavailable", { retryable: true }));
      },
    },
    createChannel(),
    { sleeps },
  );

  const response = await handler(request());

  assert.equal(response.status, 502);
  assert.equal(senderCalls, 3);
  assert.deepEqual(sleeps, [1062, 2062]);
  assert.deepEqual(state.failed, [{
    deliveryId: "delivery-1",
    error: "upstream unavailable",
    retryable: true,
    nextAttemptAt: new Date("2026-10-23T08:35:00.000Z"),
  }]);
});

test("marks a Delivery sent when an immediate retry succeeds", async () => {
  const { repository, state } = createRepository();
  let senderCalls = 0;
  const handler = createTestHandler(repository, {
    send() {
      senderCalls++;
      if (senderCalls === 1) return Promise.reject(new Error("network unavailable"));
      return Promise.resolve({ messageId: "message-after-retry" });
    },
  });

  const response = await handler(request());

  assert.equal(response.status, 200);
  assert.equal(senderCalls, 2);
  assert.deepEqual(state.sent, [{ deliveryId: "delivery-1", messageId: "message-after-retry" }]);
  assert.deepEqual(state.failed, []);
});

test("uses the 5, 15, 60, 360 minute backoff and stops at the fifth attempt", async () => {
  const { repository, state } = createRepository();
  const handler = createTestHandler(repository, {
    send: () => Promise.reject(new DeliverySendError("upstream unavailable", { retryable: true })),
  });
  const expectedDelays = [5, 15, 60, 360];

  for (const [index, attemptCount] of [1, 2, 3, 4, 5].entries()) {
    state.claim = createDelivery({ attemptCount });
    await handler(request());

    const expected = index < expectedDelays.length
      ? new Date(FIXED_NOW.getTime() + expectedDelays[index] * 60_000)
      : null;
    assert.deepEqual(state.failed[index]?.nextAttemptAt, expected);
  }
});
