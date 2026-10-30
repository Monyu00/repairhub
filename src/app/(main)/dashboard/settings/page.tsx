import { redirect } from "next/navigation";

import type { Metadata } from "next";

import { getLocationCatalog } from "@/lib/locations";
import { getSession } from "@/server/auth/session";

import type { CategoryItem } from "./_actions/category-actions";
import { fetchAllTechnicianCategories } from "./_actions/technician-category-actions";
import { fetchUsers } from "./_actions/user-actions";
import { SettingsPage } from "./_components/settings-page";

export const metadata: Metadata = {
  title: "系統設定 - RepairHub",
  description: "全校設施設備報修系統核心維護、地點管理與使用者權限設定。",
};

interface PageProps {
  searchParams: Promise<{ tab?: string }>;
}

export default async function Page(props: PageProps) {
  const [session, searchParams] = await Promise.all([getSession(), props.searchParams]);

  if (!session) {
    redirect("/login");
  }

  if (session.role !== "admin") {
    redirect("/dashboard");
  }

  const supabase = session.supabase;

  // Fetch categories, locations, users, and technician categories in parallel
  const [categoriesRes, buildings, usersRes, techCategoriesRes] = await Promise.all([
    supabase.from("categories").select("*").order("sort_order", { ascending: true }),
    getLocationCatalog(supabase),
    fetchUsers(),
    fetchAllTechnicianCategories(),
  ]);

  if (categoriesRes.error) {
    console.error("Error fetching categories for settings page:", categoriesRes.error);
  }

  const users = usersRes.users ?? [];
  const technicianCategoryMap = techCategoriesRes.technicianCategoryMap ?? {};

  return (
    <SettingsPage
      categories={(categoriesRes.data as CategoryItem[] | null) ?? []}
      buildings={buildings}
      users={users}
      technicianCategoryMap={technicianCategoryMap}
      defaultTab={searchParams.tab}
    />
  );
}
