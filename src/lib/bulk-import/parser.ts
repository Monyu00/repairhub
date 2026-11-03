import * as ExcelJS from "exceljs";

import { parseCsv } from "./csv";
import { BULK_IMPORT_MAX_FILE_SIZE, BULK_IMPORT_MAX_ROWS } from "./types";

export type SpreadsheetRows = Array<{ row: number; values: Record<string, string> }>;

export async function readBulkImportTable(file: File, sheetName: string, requiredHeaders: readonly string[]) {
  validateFileSize(file);

  const tables = file.name.toLowerCase().endsWith(".xlsx")
    ? await readWorkbookTables(file, [sheetName])
    : { [sheetName]: await readCsvTable(file) };
  const rows = tables[sheetName];

  if (!rows) {
    throw new Error(`找不到工作表：${sheetName}`);
  }
  if (rows.length === 0) {
    throw new Error(`${sheetName} 沒有資料列`);
  }
  if (rows.length > BULK_IMPORT_MAX_ROWS) {
    throw new Error(`資料列數不可超過 ${BULK_IMPORT_MAX_ROWS} 列`);
  }

  const headers = Object.keys(rows[0].values);
  const missingHeaders = requiredHeaders.filter((header) => !headers.includes(header));
  if (missingHeaders.length > 0) {
    throw new Error(`缺少欄位：${missingHeaders.join(", ")}`);
  }

  return rows;
}

export async function readLocationWorkbook(file: File) {
  validateFileSize(file);

  const tables = await readWorkbookTables(file, ["Buildings", "Spaces"]);
  const buildings = tables.Buildings;
  const spaces = tables.Spaces;

  if (!buildings || !spaces) {
    throw new Error("地點工作簿必須包含 Buildings 與 Spaces 資料");
  }

  if (buildings.length === 0 || spaces.length === 0) {
    throw new Error("地點工作簿必須包含 Buildings 與 Spaces 資料");
  }
  if (buildings.length + spaces.length > BULK_IMPORT_MAX_ROWS) {
    throw new Error(`資料列總數不可超過 ${BULK_IMPORT_MAX_ROWS} 列`);
  }

  validateHeaders(buildings, ["code", "name"]);
  validateHeaders(spaces, ["building_code", "name", "floor"]);

  return { buildings, spaces };
}

function validateFileSize(file: File) {
  if (file.size === 0) {
    throw new Error("檔案是空的");
  }
  if (file.size > BULK_IMPORT_MAX_FILE_SIZE) {
    throw new Error("檔案大小不可超過 5MB");
  }
}

async function readCsvTable(file: File): Promise<SpreadsheetRows> {
  return parseCsv(await file.text()).map((rawValues) => {
    const values = { ...rawValues };
    const row = Number(values.__csvRow);
    delete values.__csvRow;
    return { row, values };
  });
}

async function readWorkbookTables(
  file: File,
  sheetNames: readonly string[],
): Promise<Partial<Record<string, SpreadsheetRows>>> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(await file.arrayBuffer());

  const tables: Record<string, SpreadsheetRows> = {};
  for (const sheetName of sheetNames) {
    const worksheet = workbook.getWorksheet(sheetName);
    if (!worksheet) continue;
    tables[sheetName] = extractWorksheet(worksheet, sheetName);
  }

  if (Object.keys(tables).length === 0) {
    throw new Error(`找不到工作表：${sheetNames.join("、")}`);
  }

  return tables;
}

function extractWorksheet(worksheet: ExcelJS.Worksheet, sourceName: string): SpreadsheetRows {
  const headerRow = worksheet.getRow(1);
  const headers = worksheet.rowCount > 0 ? headerRow.values : [];
  const headerMap = new Map<number, string>();

  if (Array.isArray(headers)) {
    headers.forEach((header, index) => {
      const name = cellText(header).trim();
      if (name) headerMap.set(index, name);
    });
  }

  const rows: SpreadsheetRows = [];
  worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber === 1) return;

    const values: Record<string, string> = {};
    let hasValue = false;
    for (const [column, header] of headerMap) {
      const text = cellText(row.getCell(column).value).trim();
      values[header] = text;
      hasValue ||= text !== "";
    }

    if (hasValue) rows.push({ row: rowNumber, values });
  });

  if (rows.length === 0) {
    throw new Error(`工作表 ${sourceName} 沒有資料列`);
  }
  if (rows.length > BULK_IMPORT_MAX_ROWS) {
    throw new Error(`資料列數不可超過 ${BULK_IMPORT_MAX_ROWS} 列`);
  }

  return rows;
}

function validateHeaders(rows: SpreadsheetRows, requiredHeaders: readonly string[]) {
  const headers = Object.keys(rows[0].values);
  const missingHeaders = requiredHeaders.filter((header) => !headers.includes(header));
  if (missingHeaders.length > 0) {
    throw new Error(`缺少欄位：${missingHeaders.join(", ")}`);
  }
}

function cellText(value: ExcelJS.CellValue): string {
  if (value == null) return "";
  if (value instanceof Date) return formatLocalDate(value);
  if (typeof value === "object") {
    if ("text" in value) return String(value.text);
    if ("result" in value) return String(value.result ?? "");
    if ("richText" in value) return value.richText.map((item) => item.text).join("");
  }
  return String(value);
}

function formatLocalDate(value: Date): string {
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${value.getFullYear()}-${month}-${day}`;
}
