import { redirect } from "next/navigation";

import type { Metadata } from "next";

import { createClient } from "@/lib/supabase/server";

import type { CategoryItem } from "./_actions/category-actions";
import type { BuildingItem, BuildingWithSpaces, SpaceItem } from "./_actions/location-actions";
import { fetchAllTechnicianCategories } from "./_actions/technician-category-actions";
import { fetchUsers } from "./_actions/user-actions";
import { SettingsPage } from "./_components/settings-page";

export const metadata: Metadata = {
  title: "系統設定 - RepairHub",
  description: "全校設施設備報修系統核心維護、地點管理與使用者權限設定。",
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

  // 3. Fetch categories, buildings, users, and technician categories in parallel
  const [categoriesRes, buildingsRes, usersRes, techCategoriesRes] = await Promise.all([
    supabase.from("categories").select("*").order("sort_order", { ascending: true }),
    supabase.from("buildings").select("*, spaces(*)").order("name", { ascending: true }),
    fetchUsers(),
    fetchAllTechnicianCategories(),
  ]);

  if (categoriesRes.error) {
    console.error("Error fetching categories for settings page:", categoriesRes.error);
  }

  if (buildingsRes.error) {
    console.error("Error fetching buildings for settings page:", buildingsRes.error);
  }

  const rawBuildings = (buildingsRes.data as (BuildingItem & { spaces: SpaceItem[] })[] | null) ?? [];
  const buildings: BuildingWithSpaces[] = rawBuildings.map((b) => ({
    ...b,
    spaces: (b.spaces ?? []).sort((a, b) => {
      if (a.floor !== b.floor) return a.floor - b.floor;
      return a.name.localeCompare(b.name, "zh-Hant");
    }),
  }));

  const users = usersRes.users ?? [];
  const technicianCategoryMap = techCategoriesRes.technicianCategoryMap ?? {};

  return (
    <SettingsPage
      categories={(categoriesRes.data as CategoryItem[] | null) ?? []}
      buildings={buildings}
      users={users}
      technicianCategoryMap={technicianCategoryMap}
    />
  );
}
