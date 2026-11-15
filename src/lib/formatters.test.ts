import { formatDateOnly, formatMonthDay, formatTicketDate } from "./formatters";
import assert from "node:assert/strict";
import test from "node:test";

test("formatTicketDate always formats in Asia/Taipei", () => {
  const previousTimeZone = process.env.TZ;
  process.env.TZ = "America/Los_Angeles";

  try {
    assert.equal(formatTicketDate("2026-10-02T18:18:00.000Z"), "2026/10/03 02:18");
  } finally {
    if (previousTimeZone === undefined) delete process.env.TZ;
    else process.env.TZ = previousTimeZone;
  }
});

test("formatMonthDay always formats in Asia/Taipei", () => {
  assert.equal(formatMonthDay("2026-10-02T18:18:00.000Z"), "10/3");
});

test("formatDateOnly always formats in Asia/Taipei", () => {
  assert.equal(formatDateOnly("2026-10-02T18:18:00.000Z"), "2026/10/3");
});
