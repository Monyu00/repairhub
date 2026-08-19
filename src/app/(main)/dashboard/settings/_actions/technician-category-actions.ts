"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin, safeAction } from "@/server/auth";

export async function fetchTechnicianCategories(
  technicianId: string,
): Promise<{ success: boolean; error?: string; categoryIds: string[] }> {
  const result = await safeAction(async () => {
    const { supabase } = await requireAdmin();

    const { data, error: fetchError } = await supabase
      .from("technician_categories")
      .select("category_id")
      .eq("technician_id", technicianId);

    if (fetchError) {
      console.error("Failed to fetch technician categories:", fetchError);
      return { success: false, error: "無法讀取技師類別訂閱資料", categoryIds: [] };
    }

    return { success: true, categoryIds: (data || []).map((row) => row.category_id) };
  });

  if (!result.success) {
    return { success: false, error: result.error, categoryIds: [] };
  }

  return result;
}

export async function fetchAllTechnicianCategories(): Promise<{
  success: boolean;
  error?: string;
  technicianCategoryMap: Record<string, string[]>;
}> {
  const result = await safeAction(async () => {
    const { supabase } = await requireAdmin();

    const { data, error: fetchError } = await supabase
      .from("technician_categories")
      .select("technician_id, category_id");

    if (fetchError) {
      console.error("Failed to fetch all technician categories:", fetchError);
      return { success: false, error: "無法讀取所有技師類別對照資料", technicianCategoryMap: {} };
    }

    const map: Record<string, string[]> = {};
    for (const row of data || []) {
      if (!map[row.technician_id]) {
        map[row.technician_id] = [];
      }
      map[row.technician_id].push(row.category_id);
    }

    return { success: true, technicianCategoryMap: map };
  });

  if (!result.success) {
    return { success: false, error: result.error, technicianCategoryMap: {} };
  }

  return result;
}

export async function updateTechnicianCategories(
  technicianId: string,
  categoryIds: string[],
): Promise<{ success: boolean; error?: string }> {
  return safeAction(async () => {
    const { supabase } = await requireAdmin();

    // 1. Delete existing category subscriptions for this technician
    const { error: deleteError } = await supabase
      .from("technician_categories")
      .delete()
      .eq("technician_id", technicianId);

    if (deleteError) {
      console.error("Failed to delete old technician categories:", deleteError);
      return { success: false, error: "清空原先類別訂閱時發生錯誤" };
    }

    // 2. Insert new category subscriptions if any selected
    if (categoryIds.length > 0) {
      const rowsToInsert = categoryIds.map((catId) => ({
        technician_id: technicianId,
        category_id: catId,
      }));

      const { error: insertError } = await supabase.from("technician_categories").insert(rowsToInsert);

      if (insertError) {
        console.error("Failed to insert new technician categories:", insertError);
        return { success: false, error: "新增技師類別訂閱時發生錯誤" };
      }
    }

    revalidatePath("/dashboard/settings");
    revalidatePath("/dashboard/tickets");

    return { success: true };
  });
}
