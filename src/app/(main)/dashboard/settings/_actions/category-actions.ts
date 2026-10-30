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

export async function deleteCategory(id: string): Promise<{ success: boolean; error?: string }> {
  return safeAction(async () => {
    const { supabase } = await requireAdmin();

    const { count: ticketCount, error: countError } = await supabase
      .from("tickets")
      .select("id", { count: "exact", head: true })
      .eq("category_id", id);

    if (countError) {
      console.error("Failed to check category association:", countError);
      return { success: false, error: "檢查類別關聯失敗" };
    }

    if (ticketCount && ticketCount > 0) {
      return {
        success: false,
        error: `無法刪除：已有 ${ticketCount} 筆報修單使用此類別，請改為停用。`,
      };
    }

    const { error: deleteError } = await supabase.from("categories").delete().eq("id", id);

    if (deleteError) {
      console.error("Failed to delete category:", deleteError);
      if (deleteError.code === "23503") {
        return { success: false, error: "此類別已有報修紀錄，請改為停用。" };
      }
      return { success: false, error: "刪除類別失敗，請稍後再試" };
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

export async function reorderCategories(orderedIds: string[]): Promise<{ success: boolean; error?: string }> {
  return safeAction(async () => {
    const { supabase } = await requireAdmin();

    const { error } = await supabase.rpc("reorder_categories", { ordered_ids: orderedIds });

    if (error) {
      console.error("Failed to reorder categories:", error);
      return { success: false, error: "調整排序失敗，請稍後再試" };
    }

    revalidatePath("/dashboard/settings");
    revalidatePath("/report");
    return { success: true };
  });
}
