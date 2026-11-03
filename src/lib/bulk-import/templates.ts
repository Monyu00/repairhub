import { stringifyCsv } from "./csv";
import { BUILDING_HEADERS, type BulkImportTemplate, EQUIPMENT_HEADERS, SPACE_HEADERS, USER_HEADERS } from "./types";

export async function downloadBulkImportTemplate(template: BulkImportTemplate, format: "xlsx" | "csv"): Promise<void> {
  const file = format === "xlsx" ? await createWorkbook(template) : createCsv(template);
  downloadGeneratedFile(file);
}

export function downloadGeneratedFile(file: File): void {
  const url = URL.createObjectURL(file);
  const link = document.createElement("a");
  link.href = url;
  link.download = file.name;
  link.click();
  URL.revokeObjectURL(url);
}

const xlsxMimeType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const csvMimeType = "text/csv;charset=utf-8;";
const headersByTemplate: Record<Exclude<BulkImportTemplate, "location">, readonly string[]> = {
  buildings: BUILDING_HEADERS,
  spaces: SPACE_HEADERS,
  equipment: EQUIPMENT_HEADERS,
  users: USER_HEADERS,
};

async function createWorkbook(template: BulkImportTemplate): Promise<File> {
  const ExcelJS = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  const filename = `${template}-import-template.xlsx`;

  if (template === "location") {
    addSheet(workbook, "Buildings", BUILDING_HEADERS);
    addSheet(workbook, "Spaces", SPACE_HEADERS);
  } else {
    addSheet(workbook, template, headersByTemplate[template]);
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return new File([buffer], filename, { type: xlsxMimeType });
}

function createCsv(template: BulkImportTemplate): File {
  if (template === "location") throw new Error("Location CSV templates require separate Building and Space files.");
  const headers = headersByTemplate[template];
  const csv = stringifyCsv(headers, []);
  const filename = `${template}-import-template.csv`;
  return new File([`\uFEFF${csv}`], filename, { type: csvMimeType });
}

function addSheet(workbook: import("exceljs").Workbook, name: string, headers: readonly string[]): void {
  const worksheet = workbook.addWorksheet(name);
  const headerRow = worksheet.addRow(headers);
  headerRow.font = { bold: true };
  worksheet.columns = headers.map((header) => ({ header, key: header, width: Math.max(16, header.length + 4) }));
}
