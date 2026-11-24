import * as ExcelJS from "exceljs";

import { readBulkImportTable, readLocationFile } from "./parser";
import { BULK_IMPORT_MAX_ROWS } from "./types";
import assert from "node:assert/strict";
import test from "node:test";

test("readBulkImportTable accepts CSV with BOM and logical row numbers", async () => {
  const file = new File(["\uFEFFcode,name\r\nAC-01,投影機\r\n"], "equipment.csv", { type: "text/csv" });
  const rows = await readBulkImportTable(file, "Equipment", ["code", "name"]);

  assert.deepEqual(rows, [{ row: 2, values: { code: "AC-01", name: "投影機" } }]);
});

test("readBulkImportTable formats Excel dates in the local calendar day", async () => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Equipment");
  worksheet.addRow(["purchase_date"]);
  worksheet.addRow([new Date(2026, 0, 31)]);
  const buffer = await workbook.xlsx.writeBuffer();
  const file = new File([buffer], "equipment.xlsx", {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  const rows = await readBulkImportTable(file, "Equipment", ["purchase_date"]);

  assert.equal(rows[0]?.values.purchase_date, "2026-01-31");
});

test("readLocationFile accepts a Spaces-only workbook", async () => {
  const file = await createWorkbook({
    Spaces: [
      ["building_code", "name", "floor"],
      ["A", "101", "1"],
    ],
  });

  const rows = await readLocationFile(file);

  assert.deepEqual(rows, {
    buildings: [],
    spaces: [{ row: 2, values: { building_code: "A", name: "101", floor: "1" } }],
  });
});

test("readLocationFile detects a building CSV by required headers", async () => {
  const file = new File(["\uFEFFcode,name\r\nA,A棟\r\n"], "buildings.csv", { type: "text/csv" });

  const rows = await readLocationFile(file);

  assert.deepEqual(rows, {
    buildings: [{ row: 2, values: { code: "A", name: "A棟" } }],
    spaces: [],
  });
});

test("readLocationFile ignores an empty Buildings sheet when Spaces has rows", async () => {
  const file = await createWorkbook({
    Buildings: [["code", "name"]],
    Spaces: [
      ["building_code", "name", "floor"],
      ["A", "101", "1"],
    ],
  });

  const rows = await readLocationFile(file);

  assert.deepEqual(rows, {
    buildings: [],
    spaces: [{ row: 2, values: { building_code: "A", name: "101", floor: "1" } }],
  });
});

test("readLocationFile rejects a building CSV above the row limit", async () => {
  const rows = Array.from({ length: BULK_IMPORT_MAX_ROWS + 1 }, (_, index) => `A${index},棟${index}`);
  const file = new File([`\uFEFFcode,name\r\n${rows.join("\r\n")}\r\n`], "buildings.csv", { type: "text/csv" });

  await assert.rejects(readLocationFile(file), /資料列總數不可超過 500 列/);
});

async function createWorkbook(sheets: Record<string, string[][]>) {
  const workbook = new ExcelJS.Workbook();
  for (const [name, rows] of Object.entries(sheets)) {
    const worksheet = workbook.addWorksheet(name);
    worksheet.addRow(rows[0]);
    for (const row of rows.slice(1)) {
      worksheet.addRow(row);
    }
  }
  const buffer = await workbook.xlsx.writeBuffer();
  return new File([buffer], "locations.xlsx", {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}
