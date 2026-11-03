"use server";

import { revalidatePath } from "next/cache";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin, safeAction } from "@/server/auth";

import { readBulkImportTable, readLocationWorkbook, type SpreadsheetRows } from "./parser";
import {
  BUILDING_HEADERS,
  BULK_IMPORT_MAX_ROWS,
  type BulkImportEntity,
  type BulkImportResponse,
  type BulkImportResultRow,
  EQUIPMENT_HEADERS,
  SPACE_HEADERS,
  USER_HEADERS,
} from "./types";
import { defaultPasswordFor, parseIsoDate, parseRole } from "./validation";

interface PreparedRecord<TData> {
  source: string;
  row: number;
  result: BulkImportResultRow;
  data: TData;
}

export async function bulkImportAction(formData: FormData): Promise<BulkImportResponse> {
  return safeAction(async () => {
    await requireAdmin();

    const entity = String(formData.get("entity") ?? "");
    try {
      switch (entity as BulkImportEntity) {
        case "location":
          return await importLocations(formData);
        case "equipment":
          return await importEquipment(formData);
        case "users":
          return await importUsers(formData);
        default:
          return { success: false, error: "不支援的匯入類別" };
      }
    } catch (error) {
      if (error instanceof Error && error.message) {
        return { success: false, error: error.message };
      }
      throw error;
    }
  });
}

interface BuildingRecord {
  id?: string;
  code: string;
  name: string;
}

interface PreparedSpaceData {
  buildingCode: string;
  name: string;
  floor: number;
  sort_order: number;
}

async function importLocations(formData: FormData): Promise<BulkImportResponse> {
  const { supabase } = await requireAdmin();
  const excelFile = formData.get("locationExcel");
  const buildingCsv = formData.get("buildingCsv");
  const spaceCsv = formData.get("spaceCsv");

  let buildingRows: SpreadsheetRows;
  let spaceRows: SpreadsheetRows;

  if (excelFile instanceof File && excelFile.size > 0) {
    const workbook = await readLocationWorkbook(excelFile);
    buildingRows = workbook.buildings;
    spaceRows = workbook.spaces;
  } else if (buildingCsv instanceof File && spaceCsv instanceof File && buildingCsv.size > 0 && spaceCsv.size > 0) {
    buildingRows = await readBulkImportTable(buildingCsv, "Buildings", BUILDING_HEADERS);
    spaceRows = await readBulkImportTable(spaceCsv, "Spaces", SPACE_HEADERS);
    if (buildingRows.length + spaceRows.length > BULK_IMPORT_MAX_ROWS) {
      throw new Error(`資料列總數不可超過 ${BULK_IMPORT_MAX_ROWS} 列`);
    }
  } else {
    return { success: false, error: "請上傳地點 XLSX，或同時上傳 Building 與 Space CSV" };
  }

  const { data: existingBuildings } = await supabase.from("buildings").select("id,name,code,sort_order");
  const buildingMap = new Map<string, BuildingRecord>(
    (existingBuildings ?? []).map((item) => [
      item.code.toUpperCase(),
      { id: item.id, code: item.code, name: item.name },
    ]),
  );
  const nameMap = new Map((existingBuildings ?? []).map((item) => [item.name, item]));
  const seenCodes = new Set<string>();
  const seenNames = new Set<string>();
  const buildingResults: BulkImportResultRow[] = [];
  const preparedBuildings: PreparedRecord<BuildingRecord>[] = [];

  for (const row of buildingRows) {
    const result: BulkImportResultRow = { source: "地點", row: row.row, status: "failed" };
    const code = row.values.code?.trim().toUpperCase() ?? "";
    const name = row.values.name?.trim() ?? "";
    buildingResults.push(result);

    if (!code || !name) {
      result.reason = "地點代碼與名稱為必填";
      continue;
    }
    if (buildingMap.has(code) || seenCodes.has(code)) {
      result.status = "skipped";
      result.reason = "地點已存在";
      continue;
    }
    if (nameMap.has(name) || seenNames.has(name)) {
      result.reason = "地點名稱已存在";
      continue;
    }

    seenCodes.add(code);
    seenNames.add(name);
    const building: BuildingRecord = { code, name };
    buildingMap.set(code, building);
    preparedBuildings.push({ source: "地點", row: row.row, result, data: building });
  }

  const { data: existingSpaces } = await supabase
    .from("spaces")
    .select("id,name,floor,sort_order,building_id,building:buildings(code)");
  const spaceMap = new Map(
    (existingSpaces ?? []).map((item) => {
      const building = Array.isArray(item.building) ? item.building[0] : item.building;
      return [spaceKey(building?.code ?? "", item.name, item.floor), item];
    }),
  );
  const sortCursors = new Map<string, number>();
  for (const item of existingSpaces ?? []) {
    const building = Array.isArray(item.building) ? item.building[0] : item.building;
    const code = building?.code ?? "";
    sortCursors.set(code, Math.max(sortCursors.get(code) ?? 0, item.sort_order));
  }

  const seenSpaces = new Set<string>();
  const spaceResults: BulkImportResultRow[] = [];
  const preparedSpaces: PreparedRecord<PreparedSpaceData>[] = [];

  for (const row of spaceRows) {
    const result: BulkImportResultRow = { source: "空間", row: row.row, status: "failed" };
    spaceResults.push(result);
    const buildingCode = row.values.building_code?.trim().toUpperCase() ?? "";
    const name = row.values.name?.trim() ?? "";
    const floor = Number(row.values.floor);
    const building = buildingMap.get(buildingCode);

    if (!buildingCode || !name || !Number.isInteger(floor)) {
      result.reason = "地點代碼、空間名稱與整數樓層為必填";
      continue;
    }
    if (!building) {
      result.reason = "地點代碼不存在，請先匯入 Building";
      continue;
    }

    const key = spaceKey(buildingCode, name, floor);
    if (spaceMap.has(key) || seenSpaces.has(key)) {
      result.status = "skipped";
      result.reason = "空間已存在";
      continue;
    }

    seenSpaces.add(key);
    const sortIndex = sortCursors.get(buildingCode) ?? 0;
    sortCursors.set(buildingCode, sortIndex + 1);
    preparedSpaces.push({
      source: "空間",
      row: row.row,
      result,
      data: { buildingCode, name, floor, sort_order: sortIndex + 1 },
    });
  }

  if (preparedBuildings.length > 0) {
    const nextSort = Math.max(0, ...(existingBuildings ?? []).map((item) => item.sort_order)) + 1;
    for (const [index, item] of preparedBuildings.entries()) {
      const { data, error } = await supabase
        .from("buildings")
        .upsert({ ...item.data, sort_order: nextSort + index }, { onConflict: "code", ignoreDuplicates: true })
        .select("id,code");

      if (error) {
        item.result.status = "failed";
        item.result.reason = "匯入地點失敗";
        continue;
      }

      const insertedId = data?.[0]?.id;
      if (!insertedId) {
        item.result.status = "skipped";
        item.result.reason = "地點已存在";
      } else {
        item.result.status = "created";
        const building = buildingMap.get(item.data.code);
        if (building) building.id = insertedId;
      }
    }
  }

  for (const item of preparedSpaces) {
    const building = buildingMap.get(item.data.buildingCode);
    if (!building?.id) {
      item.result.status = "failed";
      item.result.reason = "無法建立此地點，空間未匯入";
      continue;
    }

    const { data, error } = await supabase
      .from("spaces")
      .upsert(
        { building_id: building.id, name: item.data.name, floor: item.data.floor, sort_order: item.data.sort_order },
        { onConflict: "building_id,name,floor", ignoreDuplicates: true },
      )
      .select("id,building_id,name,floor");

    if (error) {
      item.result.status = "failed";
      item.result.reason = "匯入空間失敗";
      continue;
    }

    item.result.status = data?.[0]?.id ? "created" : "skipped";
    item.result.reason = item.result.status === "skipped" ? "空間已存在" : undefined;
  }

  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard/equipment");
  revalidatePath("/report");

  return buildResponse([...buildingResults, ...spaceResults]);
}

function spaceKey(buildingCode: string, name: string, floor: number): string {
  return `${buildingCode.toUpperCase()}|${name}|${floor}`;
}

async function importEquipment(formData: FormData): Promise<BulkImportResponse> {
  const { supabase } = await requireAdmin();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { success: false, error: "請選擇匯入檔案" };
  }

  const rows = await readBulkImportTable(file, "Equipment", EQUIPMENT_HEADERS);
  const { data: spaces } = await supabase.from("spaces").select("id,name,floor,building_id,building:buildings(code)");
  const spaceMap = new Map(
    (spaces ?? []).map((item) => {
      const building = Array.isArray(item.building) ? item.building[0] : item.building;
      return [spaceKey(building?.code ?? "", item.name, item.floor), item];
    }),
  );

  const { data: existingEquipment } = await supabase.from("equipment").select("id,code");
  const equipmentMap = new Map((existingEquipment ?? []).map((item) => [item.code.toUpperCase(), item]));
  const seenCodes = new Set<string>();
  const results: BulkImportResultRow[] = [];
  const prepared: PreparedRecord<{
    code: string;
    name: string;
    space_id: string;
    purchase_date: string | null;
    warranty_expiry: string | null;
  }>[] = [];

  for (const row of rows) {
    const result: BulkImportResultRow = { source: "設備", row: row.row, status: "failed" };
    results.push(result);
    const code = row.values.code?.trim().toUpperCase() ?? "";
    const name = row.values.name?.trim() ?? "";
    const floor = Number(row.values.floor);
    const purchaseDate = parseIsoDate(row.values.purchase_date);
    const warrantyDate = parseIsoDate(row.values.warranty_expiry);
    const space = spaceMap.get(
      spaceKey(row.values.building_code?.trim() ?? "", row.values.space_name?.trim() ?? "", floor),
    );

    if (!code || !name || !Number.isInteger(floor) || purchaseDate === false || warrantyDate === false) {
      result.reason = "必填欄位不足、樓層非整數，或日期格式不是 YYYY-MM-DD";
      continue;
    }
    if (equipmentMap.has(code) || seenCodes.has(code)) {
      result.status = "skipped";
      result.reason = "設備代碼已存在";
      continue;
    }
    if (!space) {
      result.reason = "找不到對應空間，請確認地點代碼、空間名稱與樓層";
      continue;
    }

    seenCodes.add(code);
    prepared.push({
      source: "設備",
      row: row.row,
      result,
      data: { code, name, space_id: space.id, purchase_date: purchaseDate, warranty_expiry: warrantyDate },
    });
  }

  if (prepared.length > 0) {
    const { data: insertedEquipment, error } = await supabase
      .from("equipment")
      .upsert(
        prepared.map((item) => item.data),
        { onConflict: "code", ignoreDuplicates: true },
      )
      .select("id,code");

    if (error) throw new Error("匯入設備失敗");
    const insertedCodes = new Set((insertedEquipment ?? []).map((item) => item.code));
    for (const item of prepared) {
      item.result.status = insertedCodes.has(item.data.code) ? "created" : "skipped";
      item.result.reason = item.result.status === "skipped" ? "設備代碼已存在" : undefined;
    }
  }

  revalidatePath("/dashboard/equipment");
  revalidatePath("/dashboard/qr-codes");
  revalidatePath("/dashboard/reports");

  return buildResponse(results);
}

async function importUsers(formData: FormData): Promise<BulkImportResponse> {
  const adminClient = createAdminClient();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { success: false, error: "請選擇匯入檔案" };
  }

  const rows = await readBulkImportTable(file, "Users", USER_HEADERS);
  const existingEmails = new Set<string>();
  let page = 1;
  let hasMorePages = true;
  while (hasMorePages) {
    const { data, error } = await adminClient.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw new Error("無法讀取既有使用者");
    for (const user of data.users) {
      if (user.email) existingEmails.add(user.email.toLowerCase());
    }
    hasMorePages = data.users.length === 1000;
    page += 1;
  }

  const seenEmails = new Set<string>();
  const results: BulkImportResultRow[] = [];
  const prepared: PreparedRecord<{
    email: string;
    password: string;
    displayName: string | null;
    department: string | null;
    phone: string | null;
    role: "admin" | "technician" | null;
  }>[] = [];

  for (const row of rows) {
    const result: BulkImportResultRow = { source: "使用者", row: row.row, status: "failed" };
    results.push(result);
    const email = row.values.email?.trim().toLowerCase() ?? "";
    const password = defaultPasswordFor(email);

    if (!email.includes("@") || !password) {
      result.reason = "Email 無效";
      continue;
    }
    if (existingEmails.has(email) || seenEmails.has(email)) {
      result.status = "skipped";
      result.reason = "使用者 Email 已存在";
      continue;
    }

    seenEmails.add(email);
    const role = parseRole(row.values.role);
    if (role === false) {
      result.reason = "角色只能是 admin、technician 或 user";
      continue;
    }

    prepared.push({
      source: "使用者",
      row: row.row,
      result,
      data: {
        email,
        password,
        displayName: row.values.display_name?.trim() || null,
        department: row.values.department?.trim() || null,
        phone: row.values.phone?.trim() || null,
        role,
      },
    });
  }

  for (let index = 0; index < prepared.length; index += 10) {
    await Promise.all(
      prepared.slice(index, index + 10).map(async (item) => {
        const { data: authUser, error: authError } = await adminClient.auth.admin.createUser({
          email: item.data.email,
          password: item.data.password,
          email_confirm: true,
          user_metadata: {
            display_name: item.data.displayName,
            department: item.data.department,
            phone: item.data.phone,
            user_role: item.data.role,
          },
        });

        if (authError || !authUser?.user) {
          item.result.status = "failed";
          item.result.reason = authError?.message ?? "建立使用者帳號失敗";
          return;
        }

        const { error: profileError } = await adminClient.from("profiles").upsert({
          id: authUser.user.id,
          display_name: item.data.displayName,
          user_role: item.data.role,
          department: item.data.department,
          phone: item.data.phone,
          is_active: true,
          must_change_password: true,
          updated_at: new Date().toISOString(),
        });

        if (profileError) {
          item.result.status = "failed";
          const { error: deleteError } = await adminClient.auth.admin.deleteUser(authUser.user.id);
          item.result.reason = deleteError
            ? "建立個人檔案失敗，且自動刪除帳號失敗，請手動檢查帳號"
            : "建立個人檔案失敗";
          return;
        }

        item.result.status = "created";
        item.result.email = item.data.email;
        item.result.password = item.data.password;
      }),
    );
  }

  revalidatePath("/dashboard/settings");
  return buildResponse(results);
}

function buildResponse(rows: BulkImportResultRow[]): BulkImportResponse {
  return {
    success: true,
    rows: rows.map((row) => ({
      ...row,
      password: row.status === "created" ? row.password : undefined,
    })),
  };
}
