"use server";

import { revalidatePath } from "next/cache";

import type { Database } from "@/lib/supabase/database.types";
import { requireAdmin, safeAction } from "@/server/auth";

export type TicketStatus = Database["public"]["Enums"]["ticket_status"];

export interface EquipmentSpaceInfo {
  id: string;
  name: string;
  floor: number;
  building_id: string;
  building: {
    id: string;
    name: string;
    code: string;
  };
}

export interface EquipmentRow {
  id: string;
  name: string;
  code: string;
  space_id: string;
  purchase_date: string | null;
  warranty_expiry: string | null;
  created_at: string;
  updated_at: string;
  space: EquipmentSpaceInfo;
}

export interface EquipmentFormData {
  name: string;
  code: string;
  space_id: string;
  purchase_date?: string | null;
  warranty_expiry?: string | null;
}

export interface EquipmentTicketHistoryItem {
  id: string;
  status: TicketStatus;
  description: string;
  created_at: string;
  reporter_email: string;
}

export async function fetchEquipmentList(): Promise<{
  success: boolean;
  error?: string;
  equipment: EquipmentRow[];
}> {
  const result = await safeAction(async () => {
    const { supabase } = await requireAdmin();

    const selectString = `
      id,
      name,
      code,
      space_id,
      purchase_date,
      warranty_expiry,
      created_at,
      updated_at,
      space:spaces(
        id,
        name,
        floor,
        building_id,
        building:buildings(
          id,
          name,
          code
        )
      )
    `;

    const { data: rawEquipment, error: fetchError } = await supabase
      .from("equipment")
      .select(selectString)
      .order("created_at", { ascending: false });

    if (fetchError) {
      console.error("Failed to fetch equipment list:", fetchError);
      return { success: false, error: "讀取設備清單失敗", equipment: [] };
    }

    type RawEquipment = Record<string, unknown>;
    const equipment: EquipmentRow[] = ((rawEquipment ?? []) as unknown[]).map((raw) => {
      const item = (raw ?? {}) as RawEquipment;
      const spaceRaw = Array.isArray(item.space) ? item.space[0] : item.space;
      const spaceData = (spaceRaw ?? {}) as Record<string, unknown>;

      let buildingData = { id: "", name: "未知大樓", code: "" };
      if (spaceData.building) {
        const bRaw = Array.isArray(spaceData.building) ? spaceData.building[0] : spaceData.building;
        if (bRaw && typeof bRaw === "object") {
          buildingData = bRaw as { id: string; name: string; code: string };
        }
      }

      return {
        id: String(item.id ?? ""),
        name: String(item.name ?? ""),
        code: String(item.code ?? ""),
        space_id: String(item.space_id ?? ""),
        purchase_date: item.purchase_date ? String(item.purchase_date) : null,
        warranty_expiry: item.warranty_expiry ? String(item.warranty_expiry) : null,
        created_at: String(item.created_at ?? ""),
        updated_at: String(item.updated_at ?? ""),
        space: {
          id: String(spaceData.id ?? ""),
          name: String(spaceData.name ?? "未知空間"),
          floor: Number(spaceData.floor ?? 0),
          building_id: String(spaceData.building_id ?? ""),
          building: buildingData,
        },
      };
    });

    return { success: true, equipment };
  });

  if (!result.success) {
    return { success: false, error: result.error, equipment: [] };
  }

  return result;
}

export async function createEquipment(data: EquipmentFormData): Promise<{ success: boolean; error?: string }> {
  return safeAction(async () => {
    const trimmedName = data.name.trim();
    const trimmedCode = data.code.trim().toUpperCase();

    if (!trimmedName || !trimmedCode || !data.space_id) {
      return { success: false, error: "設備名稱、代碼與所屬空間為必填欄位" };
    }

    const { supabase } = await requireAdmin();

    const { error: insertError } = await supabase.from("equipment").insert({
      name: trimmedName,
      code: trimmedCode,
      space_id: data.space_id,
      purchase_date: data.purchase_date ?? null,
      warranty_expiry: data.warranty_expiry ?? null,
    });

    if (insertError) {
      console.error("Failed to create equipment:", insertError);
      if (insertError.code === "23505") {
        return { success: false, error: "設備代碼已存在，請確認後重試" };
      }
      return { success: false, error: "新增設備失敗，請稍後再試" };
    }

    revalidatePath("/dashboard/equipment");
    return { success: true };
  });
}

export async function updateEquipment(
  id: string,
  data: EquipmentFormData,
): Promise<{ success: boolean; error?: string }> {
  return safeAction(async () => {
    const trimmedName = data.name.trim();
    const trimmedCode = data.code.trim().toUpperCase();

    if (!trimmedName || !trimmedCode || !data.space_id) {
      return { success: false, error: "設備名稱、代碼與所屬空間為必填欄位" };
    }

    const { supabase } = await requireAdmin();

    const { error: updateError } = await supabase
      .from("equipment")
      .update({
        name: trimmedName,
        code: trimmedCode,
        space_id: data.space_id,
        purchase_date: data.purchase_date ?? null,
        warranty_expiry: data.warranty_expiry ?? null,
      })
      .eq("id", id);

    if (updateError) {
      console.error("Failed to update equipment:", updateError);
      if (updateError.code === "23505") {
        return { success: false, error: "設備代碼已存在，請確認後重試" };
      }
      return { success: false, error: "更新設備失敗，請稍後再試" };
    }

    revalidatePath("/dashboard/equipment");
    return { success: true };
  });
}

export async function checkEquipmentTicketsCount(id: string): Promise<{
  success: boolean;
  error?: string;
  count: number;
}> {
  const result = await safeAction(async () => {
    const { supabase } = await requireAdmin();

    const { count, error: countError } = await supabase
      .from("tickets")
      .select("id", { count: "exact", head: true })
      .eq("equipment_id", id);

    if (countError) {
      console.error("Failed to check ticket association for equipment:", countError);
      return { success: false, error: "檢查報修紀錄失敗", count: 0 };
    }

    return { success: true, count: count ?? 0 };
  });

  if (!result.success) {
    return { success: false, error: result.error, count: 0 };
  }

  return result;
}

export async function deleteEquipment(id: string): Promise<{ success: boolean; error?: string }> {
  return safeAction(async () => {
    const { supabase } = await requireAdmin();

    const { error: deleteError } = await supabase.from("equipment").delete().eq("id", id);

    if (deleteError) {
      console.error("Failed to delete equipment:", deleteError);
      return { success: false, error: "刪除設備失敗，請稍後再試" };
    }

    revalidatePath("/dashboard/equipment");
    return { success: true };
  });
}

export async function fetchEquipmentTickets(equipmentId: string): Promise<{
  success: boolean;
  error?: string;
  tickets: EquipmentTicketHistoryItem[];
}> {
  const result = await safeAction(async () => {
    const { supabase } = await requireAdmin();

    const { data: tickets, error: fetchError } = await supabase
      .from("tickets")
      .select("id, status, description, created_at, reporter_email")
      .eq("equipment_id", equipmentId)
      .order("created_at", { ascending: false });

    if (fetchError) {
      console.error("Failed to fetch equipment tickets history:", fetchError);
      return { success: false, error: "讀取歷史報修單失敗", tickets: [] };
    }

    return { success: true, tickets: (tickets ?? []) as EquipmentTicketHistoryItem[] };
  });

  if (!result.success) {
    return { success: false, error: result.error, tickets: [] };
  }

  return result;
}
