import assert from "node:assert/strict";
import test from "node:test";

import type { TicketNotificationEvent } from "../_shared/delivery/events.ts";
import {
  type ClaimedEmailDelivery,
  createEmailChannel,
  type TicketEmailDisplayData,
} from "../send-ticket-email/channel.ts";
import { renderTicketEmail, ticketStatusLabel } from "../send-ticket-email/templates.ts";

const TICKET_ID = "12345678-1234-1234-1234-123456789abc";
const TRACKING_URL = `https://repairhub.monyu.dev/track/${TICKET_ID}`;

function createDelivery(overrides: Partial<ClaimedEmailDelivery> = {}): ClaimedEmailDelivery {
  return {
    id: "delivery-1",
    ticketId: TICKET_ID,
    eventType: "in_progress",
    eventKey: `ticket:${TICKET_ID}:in_progress:1761208200`,
    recipientEmail: "reporter@example.com",
    eventAt: "2026-10-23T08:30:00.000Z",
    attemptCount: 1,
    ...overrides,
  };
}

function createTicketData(overrides: Partial<TicketEmailDisplayData> = {}): TicketEmailDisplayData {
  return {
    ticketId: TICKET_ID,
    statusLabel: "維修中",
    categoryName: "空調",
    description: "三樓會議室冷氣無法啟動，需要儘速檢查。",
    location: "行政大樓 3F 301",
    updatedAt: "2026-10-23T08:30:00.000Z",
    ...overrides,
  };
}

function buildMessage(
  eventType: TicketNotificationEvent = "in_progress",
  deliveryOverrides: Partial<ClaimedEmailDelivery> = {},
  ticketOverrides: Partial<TicketEmailDisplayData> = {},
) {
  const channel = createEmailChannel({
    from: "南臺校園維修通報系統 <no-reply@notify.monyu.dev>",
    replyTo: "support@example.com",
  });
  return channel.buildMessage(
    createDelivery({ eventType, ...deliveryOverrides }),
    createTicketData({ statusLabel: ticketStatusLabel(eventType), ...ticketOverrides }),
    TRACKING_URL,
    eventType,
  );
}

test("validates the Email recipient before Ticket data is read", () => {
  const channel = createEmailChannel({ from: "from@example.com", replyTo: "reply@example.com" });

  assert.equal(channel.validateTarget(createDelivery()), null);
  assert.deepEqual(channel.validateTarget(createDelivery({ recipientEmail: "not-an-email" })), {
    status: 422,
    error: "Invalid recipient Email",
  });
});

test("renders the in-progress Email with sender, tracking URL, and stable idempotency", () => {
  const message = buildMessage();

  assert.equal(message.from, "南臺校園維修通報系統 <no-reply@notify.monyu.dev>");
  assert.equal(message.replyTo, "support@example.com");
  assert.equal(message.to, "reporter@example.com");
  assert.equal(message.subject, "【南臺校園維修通報系統】案件 #12345678 已開始維修");
  assert.equal(message.idempotencyKey, `repairhub:ticket:${TICKET_ID}:in_progress:1761208200`);
  assert.match(message.html, /#12345678/);
  assert.match(message.html, /維修中/);
  assert.match(message.html, /空調/);
  assert.match(message.html, /行政大樓 3F 301/);
  assert.match(message.html, /https:\/\/repairhub\.monyu\.dev\/track\/12345678-1234-1234-1234-123456789abc/);
  assert.match(message.text, /查看報修單進度：https:\/\//);
});

test("bounds the new-ticket description and excludes Reporter contact details", () => {
  const message = buildMessage("new_ticket", {
    eventKey: `ticket:${TICKET_ID}:new_ticket:1761208200`,
    recipientEmail: "technician@example.com",
  });

  assert.equal(message.to, "technician@example.com");
  assert.equal(message.subject, "【南臺校園維修通報系統】新報修案件 #12345678：空調");
  assert.match(message.html, /待處理/);
  assert.match(message.html, /<strong>問題描述：<\/strong>三樓會議室冷氣無法啟動/);
  assert.doesNotMatch(message.html, /reporter@example\.com/);
  assert.doesNotMatch(message.html, /reporter-phone/);
  assert.match(message.text, /問題描述：三樓會議室冷氣無法啟動/);
  assert.equal(message.idempotencyKey, `repairhub:ticket:${TICKET_ID}:new_ticket:1761208200`);
});

test("renders submission confirmation with the Reporter idempotency key", () => {
  const message = buildMessage("report_submitted", {
    eventKey: `ticket:${TICKET_ID}:report_submitted`,
  });

  assert.equal(message.subject, "【南臺校園維修通報系統】報修已收到 #12345678");
  assert.match(message.html, /您的報修已成功送出/);
  assert.match(message.text, /您的報修已成功送出，我們會盡快安排人員處理。/);
  assert.equal(message.idempotencyKey, `repairhub:ticket:${TICKET_ID}:report_submitted`);
});

test("keeps completion, closure, and cancellation Email copy unchanged", () => {
  const cases = [
    ["completed", "【南臺校園維修通報系統】案件 #12345678 已完工，請確認", /7 天內未確認/],
    ["closed", "【南臺校園維修通報系統】案件 #12345678 已結案", /案件已結案/],
    ["cancelled", "【南臺校園維修通報系統】案件 #12345678 已取消", /案件已取消/],
  ] as const;

  for (const [eventType, subject, copy] of cases) {
    const message = buildMessage(eventType);
    assert.equal(message.subject, subject);
    assert.match(message.text, copy);
    assert.match(message.html, copy);
  }
});

test("uses a new idempotency key when a reopened Ticket completes again", () => {
  const first = buildMessage("completed", {
    eventKey: `ticket:${TICKET_ID}:completed:1761208200`,
  });
  const second = buildMessage("completed", {
    eventKey: `ticket:${TICKET_ID}:completed:1761211800`,
  });

  assert.notEqual(first.idempotencyKey, second.idempotencyKey);
});

test("renders accessible HTML and an equivalent plain-text alternative", () => {
  const rendered = renderTicketEmail({ ...createTicketData(), trackingUrl: TRACKING_URL }, "in_progress");

  assert.match(rendered.html, /<html lang="zh-Hant-TW" dir="ltr">/);
  assert.match(rendered.html, /<div lang="zh-Hant-TW" dir="ltr"/);
  assert.match(rendered.html, /<title>【南臺校園維修通報系統】案件 #12345678 已開始維修<\/title>/);
  assert.equal((rendered.html.match(/<h1/g) ?? []).length, 1);
  assert.match(rendered.html, />查看報修單進度<\/a>/);
  assert.match(rendered.text, /報修單編號：#12345678/);
  assert.match(rendered.text, /地點：行政大樓 3F 301/);
});

test("caps the new-ticket description summary at 160 characters", () => {
  const rendered = renderTicketEmail(
    { ...createTicketData({ description: "冷".repeat(200) }), trackingUrl: TRACKING_URL },
    "new_ticket",
  );

  const expectedSummary = `${"冷".repeat(157)}...`;
  assert.equal(rendered.html.includes(`<strong>問題描述：</strong>${expectedSummary}`), true);
  assert.equal(rendered.text.includes(`問題描述：${expectedSummary}`), true);
  assert.equal(rendered.html.includes(`<strong>問題描述：</strong>${"冷".repeat(158)}`), false);
});
