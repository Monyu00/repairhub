export type BulkImportEntity = "location" | "equipment" | "users";
export type BulkImportTemplate = "location" | "buildings" | "spaces" | "equipment" | "users";

export type BulkImportStatus = "created" | "skipped" | "failed";

export interface BulkImportResultRow {
  source: string;
  row: number;
  status: BulkImportStatus;
  reason?: string;
  email?: string;
  password?: string;
}

export interface BulkImportResponse {
  success: boolean;
  error?: string;
  rows?: BulkImportResultRow[];
}

export const BULK_IMPORT_MAX_ROWS = 500;
export const BULK_IMPORT_MAX_FILE_SIZE = 5 * 1024 * 1024;

export const BUILDING_HEADERS = ["code", "name"] as const;
export const SPACE_HEADERS = ["building_code", "name", "floor"] as const;
export const EQUIPMENT_HEADERS = [
  "code",
  "name",
  "building_code",
  "space_name",
  "floor",
  "purchase_date",
  "warranty_expiry",
] as const;
export const USER_HEADERS = ["email", "display_name", "department", "phone", "role"] as const;
