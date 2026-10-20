import { getTicketStatusPresentation } from "./ticket-status";
import assert from "node:assert/strict";
import test from "node:test";

const statuses = ["pending", "in_progress", "completed", "closed", "cancelled"] as const;

test("getTicketStatusPresentation maps every Ticket status", () => {
  const labels = new Set<string>();

  for (const status of statuses) {
    const presentation = getTicketStatusPresentation(status);

    assert.ok(presentation.label.length > 0);
    assert.ok(presentation.icon);
    assert.ok(presentation.dotClass.length > 0);
    assert.ok(presentation.badgeVariant);
    labels.add(presentation.label);
  }

  assert.equal(labels.size, statuses.length);
});

test("getTicketStatusPresentation uses canonical Ticket status labels", () => {
  assert.equal(getTicketStatusPresentation("pending").label, "待處理");
  assert.equal(getTicketStatusPresentation("in_progress").label, "維修中");
  assert.equal(getTicketStatusPresentation("completed").label, "已完工");
  assert.equal(getTicketStatusPresentation("closed").label, "已結案");
  assert.equal(getTicketStatusPresentation("cancelled").label, "已取消");
});
