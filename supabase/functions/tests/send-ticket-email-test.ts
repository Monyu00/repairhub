import assert from "node:assert/strict";
import test from "node:test";

import {
  type ClaimedDelivery,
  createRequestHandler,
  type EmailMessage,
  EmailSendError,
  type NotificationRepository,
  type RequestHandlerDependencies,
  SERVICE_SECRET_HEADER,
} from "../send-ticket-email/handler.ts";
import { renderTicketEmail, ticketStatusLabel } from "../send-ticket-email/templates.ts";

const SERVICE_SECRET = "test-service-secret";
const FIXED_NOW = new Date("2026-10-23T08:30:00.000Z");

function createDelivery(overrides: Partial<ClaimedDelivery> = {}): ClaimedDelivery {
  return {
    id: "delivery-1",
    ticketId: "12345678-1234-1234-1234-123456789abc",
    eventType: "in_progress",
    eventKey: "ticket:12345678-1234-1234-1234-123456789abc:in_progress:1761208200",
    recipientEmail: "reporter@example.com",
    eventAt: "2026-10-23T08:30:00.000Z",
    attemptCount: 1,
    ...overrides,
  };
}

function createRepository() {
  const state = {
    claim: createDelivery() as ClaimedDelivery | null,
    ticketFound: true,
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
      return Promise.resolve(state.claim);
    },
    getTicketData(delivery) {
      if (!state.ticketFound) return Promise.resolve(null);

      return Promise.resolve({
        ticketId: delivery.ticketId,
        statusLabel: ticketStatusLabel(delivery.eventType),
        categoryName: "空調",
        location: "行政大樓 3F 301",
        updatedAt: delivery.eventAt,
        description: "三樓會議室冷氣無法啟動，需要儘速檢查。",
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
    from: "RepairHub <no-reply@notify.monyu.dev>",
    replyTo: "support@example.com",
    appBaseUrl: "https://repairhub.monyu.dev",
    repository,
    sender,
    now: () => FIXED_NOW,
    sleep: async () => {},
    random: () => 0,
    ...overrides,
  });
}

function request(deliveryId = "delivery-1", secret = SERVICE_SECRET): Request {
  return new Request("https://example.test/functions/v1/send-ticket-email", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      [SERVICE_SECRET_HEADER]: secret,
    },
    body: JSON.stringify({ delivery_id: deliveryId }),
  });
}

test("rejects a missing or invalid service secret without claiming or sending", async () => {
  const { repository } = createRepository();
  let senderCalls = 0;
  const handler = createTestHandler(repository, {
    send() {
      senderCalls++;
      return Promise.resolve({ messageId: "unexpected" });
    },
  });

  const response = await handler(request("delivery-1", "wrong-secret"));

  assert.equal(response.status, 401);
  assert.equal(senderCalls, 0);
});

test("sends the in-progress Email with stable content and idempotency", async () => {
  const { repository, state } = createRepository();
  const messages: EmailMessage[] = [];
  const handler = createTestHandler(repository, {
    send(message) {
      messages.push(message);
      return Promise.resolve({ messageId: "resend-message-1" });
    },
  });

  const response = await handler(request());
  const body = (await response.json()) as Record<string, unknown>;

  assert.equal(response.status, 200);
  assert.equal(body.message_id, "resend-message-1");
  assert.equal(messages.length, 1);
  assert.equal(messages[0]?.to, "reporter@example.com");
  assert.equal(messages[0]?.subject, "【RepairHub】案件 #12345678 已開始維修");
  assert.equal(
    messages[0]?.idempotencyKey,
    "repairhub:ticket:12345678-1234-1234-1234-123456789abc:in_progress:1761208200",
  );
  assert.match(messages[0]?.html ?? "", /#12345678/);
  assert.match(messages[0]?.html ?? "", /維修中/);
  assert.match(messages[0]?.html ?? "", /空調/);
  assert.match(messages[0]?.html ?? "", /行政大樓 3F 301/);
  assert.match(messages[0]?.html ?? "", /https:\/\/repairhub\.monyu\.dev\/track\/12345678-1234-1234-1234-123456789abc/);
  assert.match(messages[0]?.text ?? "", /查看報修單進度：https:\/\//);
  assert.deepEqual(state.sent, [{ deliveryId: "delivery-1", messageId: "resend-message-1" }]);
});

test("sends the new-ticket Email with a bounded description and no Reporter contact", async () => {
  const { repository, state } = createRepository();
  state.claim = createDelivery({
    id: "delivery-new-ticket",
    eventType: "new_ticket",
    eventKey: "ticket:12345678-1234-1234-1234-123456789abc:new_ticket:1761208200",
    recipientEmail: "technician@example.com",
  });
  const messages: EmailMessage[] = [];
  const handler = createTestHandler(repository, {
    send(message) {
      messages.push(message);
      return Promise.resolve({ messageId: "resend-message-new-ticket" });
    },
  });

  const response = await handler(request("delivery-new-ticket"));

  assert.equal(response.status, 200);
  assert.equal(messages.length, 1);
  assert.equal(messages[0]?.to, "technician@example.com");
  assert.equal(messages[0]?.subject, "【RepairHub】新報修案件 #12345678：空調");
  assert.match(messages[0]?.html ?? "", /待處理/);
  assert.match(messages[0]?.html ?? "", /<strong>報修類別：<\/strong>空調/);
  assert.match(messages[0]?.html ?? "", /<strong>問題描述：<\/strong>三樓會議室冷氣無法啟動/);
  assert.match(messages[0]?.html ?? "", /https:\/\/repairhub\.monyu\.dev\/track\/12345678-1234-1234-1234-123456789abc/);
  assert.doesNotMatch(messages[0]?.html ?? "", /reporter@example\.com/);
  assert.doesNotMatch(messages[0]?.html ?? "", /reporter-phone/);
  assert.match(messages[0]?.text ?? "", /問題描述：三樓會議室冷氣無法啟動/);
  assert.match(messages[0]?.text ?? "", /查看報修單進度：https:\/\//);
  assert.deepEqual(state.sent, [{ deliveryId: "delivery-new-ticket", messageId: "resend-message-new-ticket" }]);
});

test("does not send a new-ticket Email to an invalid recipient", async () => {
  const { repository, state } = createRepository();
  state.claim = createDelivery({
    id: "delivery-invalid-recipient",
    eventType: "new_ticket",
    recipientEmail: "not-an-email",
  });
  let senderCalls = 0;
  const handler = createTestHandler(repository, {
    send() {
      senderCalls++;
      return Promise.resolve({ messageId: "unexpected" });
    },
  });

  const response = await handler(request("delivery-invalid-recipient"));

  assert.equal(response.status, 422);
  assert.equal(senderCalls, 0);
  assert.deepEqual(state.failed, [
    {
      deliveryId: "delivery-invalid-recipient",
      error: "Invalid recipient Email",
      retryable: false,
      nextAttemptAt: null,
    },
  ]);
});

test("sends the completed Email with confirmation and seven-day auto-close guidance", async () => {
  const { repository, state } = createRepository();
  state.claim = createDelivery({
    id: "delivery-completed",
    eventType: "completed",
    eventKey: "ticket:12345678-1234-1234-1234-123456789abc:completed:1761208200",
  });
  const messages: EmailMessage[] = [];
  const handler = createTestHandler(repository, {
    send(message) {
      messages.push(message);
      return Promise.resolve({ messageId: "resend-message-completed" });
    },
  });

  const response = await handler(request("delivery-completed"));

  assert.equal(response.status, 200);
  assert.equal(messages.length, 1);
  assert.equal(messages[0]?.subject, "【RepairHub】案件 #12345678 已完工，請確認");
  assert.match(messages[0]?.html ?? "", /確認修復結果/);
  assert.match(messages[0]?.html ?? "", /<strong>報修類別：<\/strong>空調/);
  assert.match(messages[0]?.html ?? "", /<strong>地點：<\/strong>行政大樓 3F 301/);
  assert.match(messages[0]?.html ?? "", /<strong>更新時間：<\/strong>2026\/10\/23\s16:30/);
  assert.match(messages[0]?.text ?? "", /https:\/\/repairhub\.monyu\.dev\/track\/12345678-1234-1234-1234-123456789abc/);
  assert.match(messages[0]?.text ?? "", /7 天內未確認/);
  assert.match(messages[0]?.text ?? "", /自動結案/);
  assert.match(messages[0]?.html ?? "", /已完工/);
  assert.deepEqual(state.sent, [{ deliveryId: "delivery-completed", messageId: "resend-message-completed" }]);
});

test("sends the closed Email after reporter confirmation or seven-day auto-close", async () => {
  const { repository, state } = createRepository();
  state.claim = createDelivery({
    id: "delivery-closed",
    eventType: "closed",
    eventKey: "ticket:12345678-1234-1234-1234-123456789abc:closed:1761208200",
  });
  const messages: EmailMessage[] = [];
  const handler = createTestHandler(repository, {
    send(message) {
      messages.push(message);
      return Promise.resolve({ messageId: "resend-message-closed" });
    },
  });

  const response = await handler(request("delivery-closed"));

  assert.equal(response.status, 200);
  assert.equal(messages.length, 1);
  assert.equal(messages[0]?.subject, "【RepairHub】案件 #12345678 已結案");
  assert.match(messages[0]?.html ?? "", /案件已結案/);
  assert.match(messages[0]?.html ?? "", /<strong>報修類別：<\/strong>空調/);
  assert.match(messages[0]?.html ?? "", /<strong>地點：<\/strong>行政大樓 3F 301/);
  assert.match(messages[0]?.html ?? "", /<strong>更新時間：<\/strong>2026\/10\/23\s16:30/);
  assert.match(messages[0]?.text ?? "", /https:\/\/repairhub\.monyu\.dev\/track\/12345678-1234-1234-1234-123456789abc/);
  assert.match(messages[0]?.text ?? "", /已結案/);
  assert.match(messages[0]?.html ?? "", /已結案/);
  assert.deepEqual(state.sent, [{ deliveryId: "delivery-closed", messageId: "resend-message-closed" }]);
});

test("allows a reopened Ticket to complete again with a new stable event key", async () => {
  const deliveries = [
    createDelivery({
      id: "delivery-first-completion",
      eventType: "completed",
      eventKey: "ticket:12345678-1234-1234-1234-123456789abc:completed:1761208200",
      eventAt: "2026-10-23T08:30:00.000Z",
    }),
    createDelivery({
      id: "delivery-second-completion",
      eventType: "completed",
      eventKey: "ticket:12345678-1234-1234-1234-123456789abc:completed:1761211800",
      eventAt: "2026-10-23T09:30:00.000Z",
    }),
  ];
  let claimIndex = 0;
  const messages: EmailMessage[] = [];
  const repository: NotificationRepository = {
    claimDelivery() {
      const delivery = deliveries[claimIndex] ?? null;
      claimIndex++;
      return Promise.resolve(delivery);
    },
    getTicketData(delivery) {
      return Promise.resolve({
        ticketId: delivery.ticketId,
        statusLabel: "已完工",
        categoryName: "空調",
        description: "冷氣無法啟動",
        location: "行政大樓 3F 301",
        updatedAt: delivery.eventAt,
      });
    },
    markSent() {
      return Promise.resolve();
    },
    markFailed() {
      return Promise.resolve();
    },
  };
  const handler = createTestHandler(repository, {
    send(message) {
      messages.push(message);
      return Promise.resolve({ messageId: `resend-message-${messages.length}` });
    },
  });

  const firstResponse = await handler(request("delivery-first-completion"));
  const secondResponse = await handler(request("delivery-second-completion"));

  assert.equal(firstResponse.status, 200);
  assert.equal(secondResponse.status, 200);
  assert.equal(messages.length, 2);
  assert.equal(new Set(messages.map((message) => message.idempotencyKey)).size, 2);
});

test("does not send twice when the delivery was already claimed", async () => {
  const { repository, state } = createRepository();
  state.claim = null;
  let senderCalls = 0;
  const handler = createTestHandler(repository, {
    send() {
      senderCalls++;
      return Promise.resolve({ messageId: "unexpected" });
    },
  });

  const response = await handler(request());
  const body = (await response.json()) as Record<string, unknown>;

  assert.equal(response.status, 200);
  assert.equal(body.skipped, "already_claimed_or_sent");
  assert.equal(senderCalls, 0);
});

test("does not send twice when concurrent invocations claim the same new-ticket delivery", async () => {
  let claimed = false;
  let senderCalls = 0;
  const repository: NotificationRepository = {
    claimDelivery: async () => {
      await Promise.resolve();
      if (claimed) return Promise.resolve(null);
      claimed = true;
      return Promise.resolve(
        createDelivery({
          eventType: "new_ticket",
          eventKey: "ticket:12345678-1234-1234-1234-123456789abc:new_ticket",
        }),
      );
    },
    getTicketData(delivery) {
      return Promise.resolve({
        ticketId: delivery.ticketId,
        statusLabel: "維修中",
        categoryName: "空調",
        description: "冷氣無法啟動",
        location: "行政大樓 3F 301",
        updatedAt: delivery.eventAt,
      });
    },
    markSent() {
      return Promise.resolve();
    },
    markFailed() {
      return Promise.resolve();
    },
  };
  const handler = createTestHandler(repository, {
    send() {
      senderCalls++;
      return Promise.resolve({ messageId: "resend-message-concurrent" });
    },
  });

  const [firstResponse, secondResponse] = await Promise.all([handler(request()), handler(request())]);

  assert.equal(firstResponse.status, 200);
  assert.equal(secondResponse.status, 200);
  assert.equal(senderCalls, 1);
});

test("retries network errors, 429, and 5xx with the same idempotency key", async () => {
  const { repository } = createRepository();
  const keys: string[] = [];
  const outcomes = [
    new EmailSendError("network unavailable", { retryable: true }),
    new EmailSendError("rate limited", { retryable: true }),
    { messageId: "resend-message-after-retry" },
  ];
  const handler = createTestHandler(repository, {
    send(message) {
      keys.push(message.idempotencyKey);
      const outcome = outcomes.shift();
      if (outcome instanceof Error) return Promise.reject(outcome);
      return Promise.resolve(outcome as { messageId: string });
    },
  });

  const response = await handler(request());

  assert.equal(response.status, 200);
  assert.equal(keys.length, 3);
  assert.equal(new Set(keys).size, 1);
});

test("does not retry permanent 4xx responses", async () => {
  const { repository, state } = createRepository();
  let senderCalls = 0;
  const handler = createTestHandler(repository, {
    send() {
      senderCalls++;
      return Promise.reject(new EmailSendError("invalid recipient", { retryable: false }));
    },
  });

  const response = await handler(request());

  assert.equal(response.status, 502);
  assert.equal(senderCalls, 1);
  assert.deepEqual(state.failed, [
    { deliveryId: "delivery-1", error: "invalid recipient", retryable: false, nextAttemptAt: null },
  ]);
});

test("stops after three transient failures and keeps the diagnostic error", async () => {
  const { repository, state } = createRepository();
  let senderCalls = 0;
  const handler = createTestHandler(repository, {
    send() {
      senderCalls++;
      return Promise.reject(new EmailSendError("upstream unavailable", { retryable: true }));
    },
  });

  const response = await handler(request());

  assert.equal(response.status, 502);
  assert.equal(senderCalls, 3);
  assert.deepEqual(state.failed, [
    {
      deliveryId: "delivery-1",
      error: "upstream unavailable",
      retryable: true,
      nextAttemptAt: new Date("2026-10-23T08:35:00.000Z"),
    },
  ]);
});

test("schedules the next persistent retry after a transient delivery failure", async () => {
  const { repository, state } = createRepository();
  const handler = createTestHandler(repository, {
    send() {
      return Promise.reject(new EmailSendError("upstream unavailable", { retryable: true }));
    },
  });

  await handler(request());

  assert.deepEqual(state.failed, [
    {
      deliveryId: "delivery-1",
      error: "upstream unavailable",
      retryable: true,
      nextAttemptAt: new Date("2026-10-23T08:35:00.000Z"),
    },
  ]);
});

test("does not schedule a persistent retry for permanent failures", async () => {
  const { repository, state } = createRepository();
  const handler = createTestHandler(repository, {
    send() {
      return Promise.reject(new EmailSendError("invalid recipient", { retryable: false }));
    },
  });

  await handler(request());

  assert.deepEqual(state.failed, [
    {
      deliveryId: "delivery-1",
      error: "invalid recipient",
      retryable: false,
      nextAttemptAt: null,
    },
  ]);
});

test("uses the persistent retry backoff and stops at the fifth attempt", async () => {
  const expectedDelays = [5, 15, 60, 360];
  const failures: Array<Date | null> = [];
  const repository: NotificationRepository = {
    claimDelivery() {
      return Promise.resolve(createDelivery({ id: "delivery-backoff" }));
    },
    getTicketData() {
      return Promise.resolve({
        ticketId: "12345678-1234-1234-1234-123456789abc",
        statusLabel: "維修中",
        categoryName: "空調",
        description: "冷氣無法啟動",
        location: "行政大樓 3F 301",
        updatedAt: "2026-10-23T08:30:00.000Z",
      });
    },
    markSent() {
      return Promise.resolve();
    },
    markFailed(_deliveryId, _error, _failedAt, options) {
      failures.push(options.nextAttemptAt);
      return Promise.resolve();
    },
  };
  const handler = createTestHandler(repository, {
    send() {
      return Promise.reject(new EmailSendError("upstream unavailable", { retryable: true }));
    },
  });

  for (const [index, attemptCount] of [1, 2, 3, 4, 5].entries()) {
    repository.claimDelivery = () => Promise.resolve(createDelivery({ id: "delivery-backoff", attemptCount }));
    await handler(request("delivery-backoff"));

    const expected = index < 4 ? new Date(FIXED_NOW.getTime() + expectedDelays[index] * 60_000) : null;
    assert.deepEqual(failures[index], expected);
  }
});

test("renders accessible HTML and an equivalent plain-text alternative", () => {
  const rendered = renderTicketEmail(
    {
      ticketId: "12345678-1234-1234-1234-123456789abc",
      statusLabel: "維修中",
      categoryName: "空調",
      description: "冷氣無法啟動",
      location: "行政大樓 3F 301",
      updatedAt: "2026-10-23T08:30:00.000Z",
      trackingUrl: "https://repairhub.monyu.dev/track/12345678-1234-1234-1234-123456789abc",
    },
    "in_progress",
  );

  assert.match(rendered.html, /<html lang="zh-Hant-TW" dir="ltr">/);
  assert.match(rendered.html, /<div lang="zh-Hant-TW" dir="ltr"/);
  assert.match(rendered.html, /<title>【RepairHub】案件 #12345678 已開始維修<\/title>/);
  assert.equal((rendered.html.match(/<h1/g) ?? []).length, 1);
  assert.match(rendered.html, />查看報修單進度<\/a>/);
  assert.match(rendered.text, /報修單編號：#12345678/);
  assert.match(rendered.text, /地點：行政大樓 3F 301/);
});

test("caps the new-ticket description summary at 160 characters", () => {
  const rendered = renderTicketEmail(
    {
      ticketId: "12345678-1234-1234-1234-123456789abc",
      statusLabel: "待處理",
      categoryName: "空調",
      description: "冷".repeat(200),
      location: "行政大樓 3F 301",
      updatedAt: "2026-10-23T08:30:00.000Z",
      trackingUrl: "https://repairhub.monyu.dev/track/12345678-1234-1234-1234-123456789abc",
    },
    "new_ticket",
  );

  const expectedSummary = `${"冷".repeat(157)}...`;
  assert.equal(rendered.html.includes(`<strong>問題描述：</strong>${expectedSummary}`), true);
  assert.equal(rendered.text.includes(`問題描述：${expectedSummary}`), true);
  assert.equal(rendered.html.includes(`<strong>問題描述：</strong>${"冷".repeat(158)}`), false);
});
