import * as ExcelJS from "exceljs";

import { parseCsv } from "./csv";
import { BUILDING_HEADERS, BULK_IMPORT_MAX_FILE_SIZE, BULK_IMPORT_MAX_ROWS, SPACE_HEADERS } from "./types";

export type SpreadsheetRows = Array<{ row: number; values: Record<string, string> }>;

export async function readBulkImportTable(file: File, sheetName: string, requiredHeaders: readonly string[]) {
  validateImportFile(file);

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

  const missingHeaders = getMissingHeaders(Object.keys(rows[0].values), requiredHeaders);
  if (missingHeaders.length > 0) {
    throw new Error(`缺少欄位：${missingHeaders.join(", ")}`);
  }

  return rows;
}

export async function readLocationFile(file: File) {
  validateImportFile(file);

  if (file.name.toLowerCase().endsWith(".xlsx")) {
    const tables = await readWorkbookTables(file, ["Buildings", "Spaces"]);
    const buildings = tables.Buildings;
    const spaces = tables.Spaces;

    if (!buildings?.length && !spaces?.length) {
      throw new Error("找不到地點或空間資料");
    }
    if (buildings?.length) validateHeaders(buildings, BUILDING_HEADERS);
    if (spaces?.length) validateHeaders(spaces, SPACE_HEADERS);
    if ((buildings?.length ?? 0) + (spaces?.length ?? 0) > BULK_IMPORT_MAX_ROWS) {
      throw new Error(`資料列總數不可超過 ${BULK_IMPORT_MAX_ROWS} 列`);
    }

    return { buildings: buildings ?? [], spaces: spaces ?? [] };
  }

  const rows = await readCsvTable(file);
  if (rows.length === 0) {
    throw new Error("CSV 沒有資料列");
  }
  if (rows.length > BULK_IMPORT_MAX_ROWS) {
    throw new Error(`資料列總數不可超過 ${BULK_IMPORT_MAX_ROWS} 列`);
  }

  const headers = Object.keys(rows[0].values);
  if (getMissingHeaders(headers, BUILDING_HEADERS).length === 0) {
    return { buildings: rows, spaces: [] };
  }
  if (getMissingHeaders(headers, SPACE_HEADERS).length === 0) {
    return { buildings: [], spaces: rows };
  }

  throw new Error("CSV 必須是地點（code,name）或空間（building_code,name,floor）欄位");
}

function getMissingHeaders(headers: readonly string[], requiredHeaders: readonly string[]) {
  return requiredHeaders.filter((header) => !headers.includes(header));
}

function validateImportFile(file: File) {
  if (!/\.(xlsx|csv)$/i.test(file.name)) {
    throw new Error("只支援 XLSX 或 CSV 檔案");
  }
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
    tables[sheetName] = extractWorksheet(worksheet);
  }

  return tables;
}

function extractWorksheet(worksheet: ExcelJS.Worksheet): SpreadsheetRows {
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

  return rows;
}

function validateHeaders(rows: SpreadsheetRows, requiredHeaders: readonly string[]) {
  const missingHeaders = getMissingHeaders(Object.keys(rows[0].values), requiredHeaders);
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
