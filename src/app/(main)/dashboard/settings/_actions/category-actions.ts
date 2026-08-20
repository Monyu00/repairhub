"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin, safeAction } from "@/server/auth";

export interface CategoryItem {
  id: string;
  name: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export async function fetchCategories(): Promise<{ success: boolean; error?: string; categories: CategoryItem[] }> {
  const result = await safeAction(async () => {
    const { supabase } = await requireAdmin();

    const { data, error: fetchError } = await supabase
      .from("categories")
      .select("*")
      .order("sort_order", { ascending: true });

    if (fetchError) {
      console.error("Failed to fetch categories:", fetchError);
      return { success: false, error: "讀取類別資料失敗", categories: [] };
    }

    return { success: true, categories: data as CategoryItem[] };
  });

  if (!result.success) {
    return { success: false, error: result.error, categories: [] };
  }

  return result;
}

export async function createCategory(name: string): Promise<{ success: boolean; error?: string }> {
  return safeAction(async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      return { success: false, error: "類別名稱不可為空白" };
    }

    const { supabase } = await requireAdmin();

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
  });
}

export async function renameCategory(id: string, newName: string): Promise<{ success: boolean; error?: string }> {
  return safeAction(async () => {
    const trimmedName = newName.trim();
    if (!trimmedName) {
      return { success: false, error: "類別名稱不可為空白" };
    }

    const { supabase } = await requireAdmin();

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
  });
}

export async function toggleCategoryActive(
  id: string,
  isActive: boolean,
): Promise<{ success: boolean; error?: string }> {
  return safeAction(async () => {
    const { supabase } = await requireAdmin();

    const { error: updateError } = await supabase.from("categories").update({ is_active: isActive }).eq("id", id);

    if (updateError) {
      console.error("Failed to toggle category active status:", updateError);
      return { success: false, error: "更新類別狀態失敗，請稍後再試" };
    }

    revalidatePath("/dashboard/settings");
    revalidatePath("/report");
    return { success: true };
  });
}

export async function swapCategoryOrder(
  item1: { id: string; sort_order: number },
  item2: { id: string; sort_order: number },
): Promise<{ success: boolean; error?: string }> {
  return safeAction(async () => {
    const { supabase } = await requireAdmin();

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
  });
}

export async function reorderCategories(orderedIds: string[]): Promise<{ success: boolean; error?: string }> {
  return safeAction(async () => {
    const { supabase } = await requireAdmin();

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
  });
}
