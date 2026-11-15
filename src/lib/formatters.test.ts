import {
  formatCompactDate,
  formatDateOnly,
  formatMediumDateTime,
  formatMonthDay,
  formatShortDateTime,
  formatTicketDate,
  getApplicationDateKey,
} from "./formatters";
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

test("new formatter interfaces always format in Asia/Taipei", () => {
  const previousTimeZone = process.env.TZ;
  process.env.TZ = "America/Los_Angeles";

  try {
    assert.equal(formatShortDateTime("2026-10-02T18:18:00.000Z"), "10/3 02:18");
    assert.equal(formatMediumDateTime("2026-10-02T18:18:00.000Z"), "2026年10月3日 凌晨2:18");
    assert.equal(getApplicationDateKey(new Date("2026-10-02T18:18:00.000Z")), "2026-10-03");
    assert.equal(formatCompactDate("2026-10-02T18:18:00.000Z"), "20261003");
    assert.equal(formatCompactDate(null), "-");
  } finally {
    if (previousTimeZone === undefined) delete process.env.TZ;
    else process.env.TZ = previousTimeZone;
  }
});
