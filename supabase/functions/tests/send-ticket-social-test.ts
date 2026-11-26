import assert from "node:assert/strict";
import test from "node:test";

import type { TicketNotificationEvent } from "../_shared/delivery/events.ts";
import {
  type ClaimedSocialDelivery,
  MissingSocialTargetError,
  socialChannel,
  type TicketSocialDisplayData,
} from "../send-ticket-social/channel.ts";

const TICKET_ID = "12345678-1234-1234-1234-123456789abc";
const TRACKING_URL = `https://repairhub.monyu.dev/track/${TICKET_ID}`;

function createDelivery(overrides: Partial<ClaimedSocialDelivery> = {}): ClaimedSocialDelivery {
  return {
    id: "delivery-1",
    ticketId: TICKET_ID,
    eventType: "report_submitted",
    eventKey: `ticket:${TICKET_ID}:report_submitted`,
    targetFingerprint: "target-fingerprint",
    eventAt: "2026-11-23T08:30:00.000Z",
    attemptCount: 1,
    ...overrides,
  };
}

function createTicketData(overrides: Partial<TicketSocialDisplayData> = {}): TicketSocialDisplayData {
  return {
    ticketId: TICKET_ID,
    webhookUrl: "https://discord.com/api/webhooks/123/fake-token",
    categoryName: "空調",
    location: "行政大樓 3F 301",
    updatedAt: "2026-11-23T08:30:00.000Z",
    ...overrides,
  };
}

function buildMessage(eventType: TicketNotificationEvent = "report_submitted") {
  return socialChannel.buildMessage(
    createDelivery({ eventType }),
    createTicketData(),
    TRACKING_URL,
    eventType,
  );
}

test("posts concise zh-TW plain text with mentions disabled and no Reporter contact", () => {
  const message = buildMessage();

  assert.equal(message.webhookUrl, "https://discord.com/api/webhooks/123/fake-token");
  assert.deepEqual(message.allowedMentions, { parse: [] });
  assert.equal(
    message.content,
    [
      "報修單編號：#12345678",
      "狀態：待處理",
      "類別：空調",
      "地點：行政大樓 3F 301",
      "更新時間：2026/11/23 16:30",
      `追蹤連結：${TRACKING_URL}`,
    ].join("\n"),
  );
});

test("renders every Ticket lifecycle label", () => {
  const cases = [
    ["new_ticket", "待處理"],
    ["report_submitted", "待處理"],
    ["in_progress", "處理中"],
    ["completed", "已完成"],
    ["closed", "已結案"],
    ["cancelled", "已取消"],
  ] as const;

  for (const [eventType, label] of cases) {
    assert.equal(buildMessage(eventType).content.split("\n")[1], `狀態：${label}`);
  }
});

test("maps a missing active target to a permanent channel failure", () => {
  assert.deepEqual(socialChannel.readFailure(new MissingSocialTargetError()), {
    status: 422,
    error: "Missing social target",
    logError: "No active social target",
  });
  assert.equal(socialChannel.readFailure(new Error("database unavailable")), null);
  assert.equal(socialChannel.validateTarget(createDelivery()), null);
});
