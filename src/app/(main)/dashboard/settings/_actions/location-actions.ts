"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin, safeAction } from "@/server/auth";

export interface BuildingItem {
  id: string;
  name: string;
  code: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface SpaceItem {
  id: string;
  name: string;
  floor: number;
  building_id: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface BuildingWithSpaces extends BuildingItem {
  spaces: SpaceItem[];
}

export async function fetchBuildingsWithSpaces(): Promise<{
  success: boolean;
  error?: string;
  buildings: BuildingWithSpaces[];
}> {
  const result = await safeAction(async () => {
    const { supabase } = await requireAdmin();

    const { data: buildings, error: buildingsError } = await supabase
      .from("buildings")
      .select("*, spaces(*)")
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });

    if (buildingsError) {
      console.error("Failed to fetch buildings with spaces:", buildingsError);
      return { success: false, error: "讀取地點與空間資料失敗", buildings: [] };
    }

    // Sort spaces by floor asc, name asc
    const formatted = (buildings as (BuildingItem & { spaces: SpaceItem[] })[]).map((b) => ({
      ...b,
      spaces: (b.spaces ?? []).sort((a, b) => {
        if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
        if (a.floor !== b.floor) return a.floor - b.floor;
        return a.name.localeCompare(b.name, "zh-Hant");
      }),
    }));

    return { success: true, buildings: formatted };
  });

  if (!result.success) {
    return { success: false, error: result.error, buildings: [] };
  }

  return result;
}

export async function createBuilding(name: string, code: string): Promise<{ success: boolean; error?: string }> {
  return safeAction(async () => {
    const trimmedName = name.trim();
    const trimmedCode = code.trim().toUpperCase();

    if (!trimmedName || !trimmedCode) {
      return { success: false, error: "地點名稱與代碼不可為空白" };
    }

    const { supabase } = await requireAdmin();

    const { data: maxSortData } = await supabase
      .from("buildings")
      .select("sort_order")
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();

    const { error: insertError } = await supabase.from("buildings").insert({
      name: trimmedName,
      code: trimmedCode,
      sort_order: (maxSortData?.sort_order ?? 0) + 1,
    });

    if (insertError) {
      console.error("Failed to create building:", insertError);
      if (insertError.code === "23505") {
        return { success: false, error: "地點名稱或代碼已存在，請確認後重試" };
      }
      return { success: false, error: "新增地點失敗，請稍後再試" };
    }

    revalidatePath("/dashboard/settings");
    revalidatePath("/report");
    return { success: true };
  });
}

export async function updateBuilding(
  id: string,
  name: string,
  code: string,
): Promise<{ success: boolean; error?: string }> {
  return safeAction(async () => {
    const trimmedName = name.trim();
    const trimmedCode = code.trim().toUpperCase();

    if (!trimmedName || !trimmedCode) {
      return { success: false, error: "地點名稱與代碼不可為空白" };
    }

    const { supabase } = await requireAdmin();

    const { error: updateError } = await supabase
      .from("buildings")
      .update({ name: trimmedName, code: trimmedCode })
      .eq("id", id);

    if (updateError) {
      console.error("Failed to update building:", updateError);
      if (updateError.code === "23505") {
        return { success: false, error: "地點名稱或代碼已存在，請確認後重試" };
      }
      return { success: false, error: "更新地點失敗，請稍後再試" };
    }

    revalidatePath("/dashboard/settings");
    revalidatePath("/report");
    return { success: true };
  });
}

export async function deleteBuilding(id: string): Promise<{ success: boolean; error?: string }> {
  return safeAction(async () => {
    const { supabase } = await requireAdmin();

    // Check association: count spaces under building
    const { count: spaceCount, error: countError } = await supabase
      .from("spaces")
      .select("id", { count: "exact", head: true })
      .eq("building_id", id);

    if (countError) {
      console.error("Failed to check space association for building:", countError);
      return { success: false, error: "檢查關聯空間失敗" };
    }

    if (spaceCount && spaceCount > 0) {
      return {
        success: false,
        error: `無法刪除：此地點底下尚有 ${spaceCount} 個所屬空間。請先刪除或轉移空間後再試。`,
      };
    }

    const { error: deleteError } = await supabase.from("buildings").delete().eq("id", id);

    if (deleteError) {
      console.error("Failed to delete building:", deleteError);
      return { success: false, error: "刪除地點失敗，請稍後再試" };
    }

    revalidatePath("/dashboard/settings");
    revalidatePath("/report");
    return { success: true };
  });
}

export async function createSpace(
  buildingId: string,
  name: string,
  floor: number,
): Promise<{ success: boolean; error?: string }> {
  return safeAction(async () => {
    const trimmedName = name.trim();

    if (!trimmedName) {
      return { success: false, error: "空間名稱不可為空白" };
    }

    if (Number.isNaN(floor)) {
      return { success: false, error: "請輸入有效的樓層數字" };
    }

    const { supabase } = await requireAdmin();

    const { data: maxSortData } = await supabase
      .from("spaces")
      .select("sort_order")
      .eq("building_id", buildingId)
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();

    const { error: insertError } = await supabase.from("spaces").insert({
      building_id: buildingId,
      name: trimmedName,
      floor: floor,
      sort_order: (maxSortData?.sort_order ?? 0) + 1,
    });

    if (insertError) {
      console.error("Failed to create space:", insertError);
      if (insertError.code === "23505") {
        return { success: false, error: "該地點的同樓層已存在相同的空間名稱" };
      }
      return { success: false, error: "新增空間失敗，請稍後再試" };
    }

    revalidatePath("/dashboard/settings");
    revalidatePath("/report");
    return { success: true };
  });
}

export async function updateSpace(
  id: string,
  name: string,
  floor: number,
): Promise<{ success: boolean; error?: string }> {
  return safeAction(async () => {
    const trimmedName = name.trim();

    if (!trimmedName) {
      return { success: false, error: "空間名稱不可為空白" };
    }

    if (Number.isNaN(floor)) {
      return { success: false, error: "請輸入有效的樓層數字" };
    }

    const { supabase } = await requireAdmin();

    const { error: updateError } = await supabase
      .from("spaces")
      .update({ name: trimmedName, floor: floor })
      .eq("id", id);

    if (updateError) {
      console.error("Failed to update space:", updateError);
      if (updateError.code === "23505") {
        return { success: false, error: "該地點的同樓層已存在相同的空間名稱" };
      }
      return { success: false, error: "更新空間失敗，請稍後再試" };
    }

    revalidatePath("/dashboard/settings");
    revalidatePath("/report");
    return { success: true };
  });
}

export async function deleteSpace(id: string): Promise<{ success: boolean; error?: string }> {
  return safeAction(async () => {
    const { supabase } = await requireAdmin();

    // Check associations: tickets and equipment
    const { count: ticketCount, error: ticketErr } = await supabase
      .from("tickets")
      .select("id", { count: "exact", head: true })
      .eq("space_id", id);

    if (ticketErr) {
      console.error("Failed to check ticket association for space:", ticketErr);
      return { success: false, error: "檢查報修單關聯失敗" };
    }

    if (ticketCount && ticketCount > 0) {
      return {
        success: false,
        error: `無法刪除：已有 ${ticketCount} 筆報修單引用此空間。`,
      };
    }

    const { count: equipCount, error: equipErr } = await supabase
      .from("equipment")
      .select("id", { count: "exact", head: true })
      .eq("space_id", id);

    if (equipErr) {
      console.error("Failed to check equipment association for space:", equipErr);
      return { success: false, error: "檢查設施設備關聯失敗" };
    }

    if (equipCount && equipCount > 0) {
      return {
        success: false,
        error: `無法刪除：已有 ${equipCount} 項設施設備綁定此空間。`,
      };
    }

    const { error: deleteError } = await supabase.from("spaces").delete().eq("id", id);

    if (deleteError) {
      console.error("Failed to delete space:", deleteError);
      return { success: false, error: "刪除空間失敗，請稍後再試" };
    }

    revalidatePath("/dashboard/settings");
    revalidatePath("/report");
    return { success: true };
  });
}

export async function reorderBuildings(orderedIds: string[]): Promise<{ success: boolean; error?: string }> {
  return safeAction(async () => {
    const { supabase } = await requireAdmin();

    const results = await Promise.all(
      orderedIds.map((id, index) =>
        supabase
          .from("buildings")
          .update({ sort_order: index + 1 })
          .eq("id", id),
      ),
    );

    if (results.some((result) => result.error)) {
      console.error("Failed to reorder buildings");
      return { success: false, error: "調整地點排序失敗，請稍後再試" };
    }

    revalidatePath("/dashboard/settings");
    revalidatePath("/report");
    return { success: true };
  });
}

export async function reorderSpaces(
  buildingId: string,
  orderedIds: string[],
): Promise<{ success: boolean; error?: string }> {
  return safeAction(async () => {
    const { supabase } = await requireAdmin();

    const results = await Promise.all(
      orderedIds.map((id, index) =>
        supabase
          .from("spaces")
          .update({ sort_order: index + 1 })
          .eq("id", id)
          .eq("building_id", buildingId),
      ),
    );

    if (results.some((result) => result.error)) {
      console.error("Failed to reorder spaces");
      return { success: false, error: "調整空間排序失敗，請稍後再試" };
    }

    revalidatePath("/dashboard/settings");
    revalidatePath("/report");
    return { success: true };
  });
}
