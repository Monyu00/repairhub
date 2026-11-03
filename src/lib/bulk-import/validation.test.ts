import { parseIsoDate, parseRole } from "./validation";
import assert from "node:assert/strict";
import test from "node:test";

test("parseIsoDate rejects impossible calendar dates", () => {
  assert.equal(parseIsoDate("2026-02-31"), false);
  assert.equal(parseIsoDate("2026-01-31"), "2026-01-31");
  assert.equal(parseIsoDate(""), null);
});

test("parseRole maps blank and user roles to null", () => {
  assert.equal(parseRole("ADMIN"), "admin");
  assert.equal(parseRole("User"), null);
  assert.equal(parseRole("invalid"), false);
});
