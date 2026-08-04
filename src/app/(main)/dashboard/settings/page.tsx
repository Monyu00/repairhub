import { redirect } from "next/navigation";

import type { Metadata } from "next";

import { createClient } from "@/lib/supabase/server";

import type { CategoryItem } from "./_actions/category-actions";
import { SettingsPage } from "./_components/settings-page";

export const metadata: Metadata = {
  title: "系統設定 - RepairHub",
  description: "全校設施設備報修系統核心維護與類別 CRUD 設定。",
};

export default async function Page() {
  const supabase = await createClient();

  // 1. Fetch authenticated user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // 2. Fetch user role from profiles
  const { data: profile } = await supabase.from("profiles").select("user_role").eq("id", user.id).maybeSingle();

  if (profile?.user_role !== "admin") {
    redirect("/dashboard");
  }

  // 3. Fetch categories for admin management (including inactive ones)
  const { data: categories, error } = await supabase
    .from("categories")
    .select("*")
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("Error fetching categories for settings page:", error);
  }

  return <SettingsPage categories={(categories as CategoryItem[]) ?? []} />;
}
