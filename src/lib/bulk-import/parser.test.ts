import * as ExcelJS from "exceljs";

import { readBulkImportTable } from "./parser";
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
