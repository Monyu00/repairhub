"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

export interface CategoryItem {
  id: string;
  name: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
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

export async function fetchCategories() {
  const { supabase, authorized, error } = await verifyAdmin();
  if (!authorized || !supabase) {
    return { success: false, error, categories: [] };
  }

  const { data, error: fetchError } = await supabase
    .from("categories")
    .select("*")
    .order("sort_order", { ascending: true });

  if (fetchError) {
    console.error("Failed to fetch categories:", fetchError);
    return { success: false, error: "讀取類別資料失敗", categories: [] };
  }

  return { success: true, categories: data as CategoryItem[] };
}

export async function createCategory(name: string) {
  const trimmedName = name.trim();
  if (!trimmedName) {
    return { success: false, error: "類別名稱不可為空白" };
  }

  const { supabase, authorized, error } = await verifyAdmin();
  if (!authorized || !supabase) {
    return { success: false, error };
  }

  // Get current max sort_order
  const { data: maxSortData } = await supabase
    .from("categories")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextSortOrder = (maxSortData?.sort_order ?? 0) + 1;

  const { error: insertError } = await supabase.from("categories").insert({
    name: trimmedName,
    sort_order: nextSortOrder,
    is_active: true,
  });

  if (insertError) {
    console.error("Failed to create category:", insertError);
    if (insertError.code === "23505") {
      return { success: false, error: "類別名稱已存在，請使用其他名稱" };
    }
    return { success: false, error: "新增類別失敗，請稍後再試" };
  }

  revalidatePath("/dashboard/settings");
  revalidatePath("/report");
  return { success: true };
}

export async function renameCategory(id: string, newName: string) {
  const trimmedName = newName.trim();
  if (!trimmedName) {
    return { success: false, error: "類別名稱不可為空白" };
  }

  const { supabase, authorized, error } = await verifyAdmin();
  if (!authorized || !supabase) {
    return { success: false, error };
  }

  const { error: updateError } = await supabase.from("categories").update({ name: trimmedName }).eq("id", id);

  if (updateError) {
    console.error("Failed to rename category:", updateError);
    if (updateError.code === "23505") {
      return { success: false, error: "類別名稱已存在，請使用其他名稱" };
    }
    return { success: false, error: "更新類別名稱失敗，請稍後再試" };
  }

  revalidatePath("/dashboard/settings");
  revalidatePath("/report");
  return { success: true };
}

export async function toggleCategoryActive(id: string, isActive: boolean) {
  const { supabase, authorized, error } = await verifyAdmin();
  if (!authorized || !supabase) {
    return { success: false, error };
  }

  const { error: updateError } = await supabase.from("categories").update({ is_active: isActive }).eq("id", id);

  if (updateError) {
    console.error("Failed to toggle category active status:", updateError);
    return { success: false, error: "更新類別狀態失敗，請稍後再試" };
  }

  revalidatePath("/dashboard/settings");
  revalidatePath("/report");
  return { success: true };
}

export async function swapCategoryOrder(
  item1: { id: string; sort_order: number },
  item2: { id: string; sort_order: number },
) {
  const { supabase, authorized, error } = await verifyAdmin();
  if (!authorized || !supabase) {
    return { success: false, error };
  }

  // Swap sort_orders
  const { error: error1 } = await supabase
    .from("categories")
    .update({ sort_order: item2.sort_order })
    .eq("id", item1.id);

  if (error1) {
    console.error("Failed to update item1 order:", error1);
    return { success: false, error: "調整排序失敗，請稍後再試" };
  }

  const { error: error2 } = await supabase
    .from("categories")
    .update({ sort_order: item1.sort_order })
    .eq("id", item2.id);

  if (error2) {
    console.error("Failed to update item2 order:", error2);
    return { success: false, error: "調整排序失敗，請稍後再試" };
  }

  revalidatePath("/dashboard/settings");
  revalidatePath("/report");
  return { success: true };
}

export async function reorderCategories(orderedIds: string[]) {
  const { supabase, authorized, error } = await verifyAdmin();
  if (!authorized || !supabase) {
    return { success: false, error };
  }

  // Update sort_order for each category according to its new index (1-based)
  const updates = orderedIds.map((id, index) =>
    supabase
      .from("categories")
      .update({ sort_order: index + 1 })
      .eq("id", id),
  );

  const results = await Promise.all(updates);
  const hasError = results.some((res) => res.error);

  if (hasError) {
    console.error("Failed to reorder categories");
    return { success: false, error: "調整排序失敗，請稍後再試" };
  }

  revalidatePath("/dashboard/settings");
  revalidatePath("/report");
  return { success: true };
}
