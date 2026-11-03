import { parseCsv, stringifyCsv } from "./csv";
import assert from "node:assert/strict";
import test from "node:test";

test("parseCsv reads quoted cells, commas, and escaped quotes", () => {
  const rows = parseCsv('code,name\r\n"AC, 01","會議室 ""A"""\r\nAC-02,教室');

  assert.deepEqual(rows, [
    { code: "AC, 01", name: '會議室 "A"', __csvRow: "2" },
    { code: "AC-02", name: "教室", __csvRow: "3" },
  ]);
});

test("stringifyCsv escapes commas, quotes, and newlines", () => {
  const csv = stringifyCsv(["code", "name"], [{ code: "AC, 01", name: '會議室 "A"' }]);

  assert.equal(csv, 'code,name\r\n"AC, 01","會議室 ""A"""');
});
