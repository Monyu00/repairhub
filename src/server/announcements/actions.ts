"use server";

import { revalidatePath } from "next/cache";

import type { Database } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin, safeAction } from "@/server/auth";

export type AnnouncementAudience = Database["public"]["Enums"]["announcement_audience"];
export type AnnouncementCategory = Database["public"]["Enums"]["announcement_category"];

export interface AnnouncementItem {
  id: string;
  title: string;
  body: string;
  category: AnnouncementCategory;
  audience: AnnouncementAudience;
  is_pinned: boolean;
  author_id: string;
  published_at: string;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
  author?: {
    display_name: string | null;
  } | null;
}

export interface CreateAnnouncementInput {
  title: string;
  body: string;
  category?: AnnouncementCategory;
  audience: AnnouncementAudience;
  is_pinned?: boolean;
  published_at?: string;
  expires_at?: string | null;
}

export interface UpdateAnnouncementInput {
  title?: string;
  body?: string;
  category?: AnnouncementCategory;
  audience?: AnnouncementAudience;
  is_pinned?: boolean;
  published_at?: string;
  expires_at?: string | null;
}

function revalidateAllAnnouncementPaths() {
  revalidatePath("/dashboard/announcements");
  revalidatePath("/dashboard");
  revalidatePath("/");
  revalidatePath("/report");
}

async function fetchActiveAnnouncements(audiences: AnnouncementAudience[], limit: number): Promise<AnnouncementItem[]> {
  try {
    const supabase = await createClient();
    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from("announcements")
      .select(
        "id, title, body, category, audience, is_pinned, author_id, published_at, expires_at, created_at, updated_at",
      )
      .in("audience", audiences)
      .lte("published_at", now)
      .or(`expires_at.is.null,expires_at.gt.${now}`)
      .order("is_pinned", { ascending: false })
      .order("published_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("Error fetching announcements:", error);
      return [];
    }

    return (data ?? []) as unknown as AnnouncementItem[];
  } catch (err) {
    console.error("fetchActiveAnnouncements unexpected error:", err);
    return [];
  }
}

/**
 * 取得公開有效的公告（供前台首頁、報修頁使用）
 */
export async function fetchPublicAnnouncements(limit = 10): Promise<AnnouncementItem[]> {
  return fetchActiveAnnouncements(["public", "all"], limit);
}

/**
 * 取得內部有效的公告（供 Dashboard 首頁使用）
 */
export async function fetchInternalAnnouncements(limit = 5): Promise<AnnouncementItem[]> {
  return fetchActiveAnnouncements(["internal", "all"], limit);
}

/**
 * 取得管理後台所有公告（包含過期、草稿、各類受眾）
 * 僅 admin 可呼叫
 */
export async function fetchAdminAnnouncements(): Promise<{
  success: boolean;
  error?: string;
  announcements: AnnouncementItem[];
}> {
  const result = await safeAction(async () => {
    const { supabase } = await requireAdmin();

    const { data, error } = await supabase
      .from("announcements")
      .select("*, author:profiles(display_name)")
      .order("is_pinned", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Failed to fetch admin announcements:", error);
      return { success: false, error: "讀取公告資料失敗", announcements: [] };
    }

    return {
      success: true,
      announcements: (data ?? []) as unknown as AnnouncementItem[],
    };
  });

  if (!result.success) {
    return { success: false, error: result.error, announcements: [] };
  }

  return result;
}

/**
 * 建立公告
 * 僅 admin 可執行
 */
export async function createAnnouncement(
  input: CreateAnnouncementInput,
): Promise<{ success: boolean; error?: string; id?: string }> {
  return safeAction(async () => {
    const title = input.title.trim();
    const body = input.body.trim();

    if (!title) {
      return { success: false, error: "公告標題不可為空白" };
    }

    if (!body) {
      return { success: false, error: "公告內文不可為空白" };
    }

    const { supabase, userId } = await requireAdmin();

    const payload: Database["public"]["Tables"]["announcements"]["Insert"] = {
      title,
      body,
      category: input.category ?? "general",
      audience: input.audience,
      is_pinned: input.is_pinned ?? false,
      author_id: userId,
      published_at: input.published_at ?? new Date().toISOString(),
      expires_at: input.expires_at ?? null,
    };

    const { data, error } = await supabase.from("announcements").insert(payload).select("id").single();

    if (error) {
      console.error("Failed to create announcement:", error);
      return { success: false, error: "新增公告失敗，請稍後再試" };
    }

    revalidateAllAnnouncementPaths();
    return { success: true, id: data.id };
  });
}

/**
 * 編輯更新公告
 * 僅 admin 可執行
 */
export async function updateAnnouncement(
  id: string,
  input: UpdateAnnouncementInput,
): Promise<{ success: boolean; error?: string }> {
  return safeAction(async () => {
    const updates: Database["public"]["Tables"]["announcements"]["Update"] = {};

    if (input.title !== undefined) {
      const title = input.title.trim();
      if (!title) return { success: false, error: "公告標題不可為空白" };
      updates.title = title;
    }

    if (input.body !== undefined) {
      const body = input.body.trim();
      if (!body) return { success: false, error: "公告內文不可為空白" };
      updates.body = body;
    }

    if (input.category !== undefined) {
      updates.category = input.category;
    }

    if (input.audience !== undefined) {
      updates.audience = input.audience;
    }

    if (input.is_pinned !== undefined) {
      updates.is_pinned = input.is_pinned;
    }

    if (input.published_at !== undefined) {
      updates.published_at = input.published_at;
    }

    if (input.expires_at !== undefined) {
      updates.expires_at = input.expires_at;
    }

    const { supabase } = await requireAdmin();

    const { error } = await supabase.from("announcements").update(updates).eq("id", id);

    if (error) {
      console.error("Failed to update announcement:", error);
      return { success: false, error: "更新公告失敗，請稍後再試" };
    }

    revalidateAllAnnouncementPaths();
    return { success: true };
  });
}

/**
 * 刪除公告（Hard delete）
 * 僅 admin 可執行
 */
export async function deleteAnnouncement(id: string): Promise<{ success: boolean; error?: string }> {
  return safeAction(async () => {
    const { supabase } = await requireAdmin();

    const { error } = await supabase.from("announcements").delete().eq("id", id);

    if (error) {
      console.error("Failed to delete announcement:", error);
      return { success: false, error: "刪除公告失敗，請稍後再試" };
    }

    revalidateAllAnnouncementPaths();
    return { success: true };
  });
}
