"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

export interface BuildingItem {
  id: string;
  name: string;
  code: string;
  created_at: string;
  updated_at: string;
}

export interface SpaceItem {
  id: string;
  name: string;
  floor: number;
  building_id: string;
  created_at: string;
  updated_at: string;
}

export interface BuildingWithSpaces extends BuildingItem {
  spaces: SpaceItem[];
}

async function verifyAdmin() {
  const supabase = await createClient();
  const { data: userRes, error: userError } = await supabase.auth.getUser();

  if (userError || !userRes.user) {
    return { supabase, authorized: false, error: "尚未登入，請先登入" };
  }

  const { data: profile } = await supabase.from("profiles").select("user_role").eq("id", userRes.user.id).maybeSingle();

  if (profile?.user_role !== "admin") {
    return { supabase, authorized: false, error: "僅系統管理者可執行此操作" };
  }

  return { supabase, authorized: true, error: undefined };
}

export async function fetchBuildingsWithSpaces() {
  const { supabase, authorized, error } = await verifyAdmin();
  if (!authorized || !supabase) {
    return { success: false, error, buildings: [] };
  }

  const { data: buildings, error: buildingsError } = await supabase
    .from("buildings")
    .select("*, spaces(*)")
    .order("name", { ascending: true });

  if (buildingsError) {
    console.error("Failed to fetch buildings with spaces:", buildingsError);
    return { success: false, error: "讀取大樓與空間資料失敗", buildings: [] };
  }

  // Sort spaces by floor asc, name asc
  const formatted = (buildings as (BuildingItem & { spaces: SpaceItem[] })[]).map((b) => ({
    ...b,
    spaces: (b.spaces ?? []).sort((a, b) => {
      if (a.floor !== b.floor) return a.floor - b.floor;
      return a.name.localeCompare(b.name, "zh-Hant");
    }),
  }));

  return { success: true, buildings: formatted };
}

export async function createBuilding(name: string, code: string) {
  const trimmedName = name.trim();
  const trimmedCode = code.trim().toUpperCase();

  if (!trimmedName || !trimmedCode) {
    return { success: false, error: "大樓名稱與代碼不可為空白" };
  }

  const { supabase, authorized, error } = await verifyAdmin();
  if (!authorized || !supabase) {
    return { success: false, error };
  }

  const { error: insertError } = await supabase.from("buildings").insert({
    name: trimmedName,
    code: trimmedCode,
  });

  if (insertError) {
    console.error("Failed to create building:", insertError);
    if (insertError.code === "23505") {
      return { success: false, error: "大樓名稱或代碼已存在，請確認後重試" };
    }
    return { success: false, error: "新增大樓失敗，請稍後再試" };
  }

  revalidatePath("/dashboard/settings");
  revalidatePath("/report");
  return { success: true };
}

export async function updateBuilding(id: string, name: string, code: string) {
  const trimmedName = name.trim();
  const trimmedCode = code.trim().toUpperCase();

  if (!trimmedName || !trimmedCode) {
    return { success: false, error: "大樓名稱與代碼不可為空白" };
  }

  const { supabase, authorized, error } = await verifyAdmin();
  if (!authorized || !supabase) {
    return { success: false, error };
  }

  const { error: updateError } = await supabase
    .from("buildings")
    .update({ name: trimmedName, code: trimmedCode })
    .eq("id", id);

  if (updateError) {
    console.error("Failed to update building:", updateError);
    if (updateError.code === "23505") {
      return { success: false, error: "大樓名稱或代碼已存在，請確認後重試" };
    }
    return { success: false, error: "更新大樓失敗，請稍後再試" };
  }

  revalidatePath("/dashboard/settings");
  revalidatePath("/report");
  return { success: true };
}

export async function deleteBuilding(id: string) {
  const { supabase, authorized, error } = await verifyAdmin();
  if (!authorized || !supabase) {
    return { success: false, error };
  }

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
      error: `無法刪除：此大樓底下尚有 ${spaceCount} 個所屬空間。請先刪除或轉移空間後再試。`,
    };
  }

  const { error: deleteError } = await supabase.from("buildings").delete().eq("id", id);

  if (deleteError) {
    console.error("Failed to delete building:", deleteError);
    return { success: false, error: "刪除大樓失敗，請稍後再試" };
  }

  revalidatePath("/dashboard/settings");
  revalidatePath("/report");
  return { success: true };
}

export async function createSpace(buildingId: string, name: string, floor: number) {
  const trimmedName = name.trim();

  if (!trimmedName) {
    return { success: false, error: "空間名稱不可為空白" };
  }

  if (Number.isNaN(floor)) {
    return { success: false, error: "請輸入有效的樓層數字" };
  }

  const { supabase, authorized, error } = await verifyAdmin();
  if (!authorized || !supabase) {
    return { success: false, error };
  }

  const { error: insertError } = await supabase.from("spaces").insert({
    building_id: buildingId,
    name: trimmedName,
    floor: floor,
  });

  if (insertError) {
    console.error("Failed to create space:", insertError);
    if (insertError.code === "23505") {
      return { success: false, error: "該大樓的同樓層已存在相同的空間名稱" };
    }
    return { success: false, error: "新增空間失敗，請稍後再試" };
  }

  revalidatePath("/dashboard/settings");
  revalidatePath("/report");
  return { success: true };
}

export async function updateSpace(id: string, name: string, floor: number) {
  const trimmedName = name.trim();

  if (!trimmedName) {
    return { success: false, error: "空間名稱不可為空白" };
  }

  if (Number.isNaN(floor)) {
    return { success: false, error: "請輸入有效的樓層數字" };
  }

  const { supabase, authorized, error } = await verifyAdmin();
  if (!authorized || !supabase) {
    return { success: false, error };
  }

  const { error: updateError } = await supabase.from("spaces").update({ name: trimmedName, floor: floor }).eq("id", id);

  if (updateError) {
    console.error("Failed to update space:", updateError);
    if (updateError.code === "23505") {
      return { success: false, error: "該大樓的同樓層已存在相同的空間名稱" };
    }
    return { success: false, error: "更新空間失敗，請稍後再試" };
  }

  revalidatePath("/dashboard/settings");
  revalidatePath("/report");
  return { success: true };
}

export async function deleteSpace(id: string) {
  const { supabase, authorized, error } = await verifyAdmin();
  if (!authorized || !supabase) {
    return { success: false, error };
  }

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
}
