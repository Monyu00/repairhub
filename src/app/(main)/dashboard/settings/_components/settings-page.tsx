"use client";

import type { CategoryItem } from "../_actions/category-actions";
import type { BuildingWithSpaces } from "../_actions/location-actions";
import type { UserItem } from "../_actions/user-actions";
import { CategoryManagement } from "./category-management";
import { LocationManagement } from "./location-management";
import { UserManagement } from "./user-management";

interface SettingsPageProps {
  categories: CategoryItem[];
  buildings: BuildingWithSpaces[];
  users: UserItem[];
  technicianCategoryMap?: Record<string, string[]>;
  defaultTab?: string;
}

export function SettingsPage({
  categories,
  buildings,
  users,
  technicianCategoryMap = {},
  defaultTab = "categories",
}: SettingsPageProps) {
  const currentTab = ["categories", "locations", "users"].includes(defaultTab) ? defaultTab : "categories";

  return (
    <div className="space-y-6">
      {currentTab === "categories" && <CategoryManagement initialCategories={categories} />}
      {currentTab === "locations" && <LocationManagement initialBuildings={buildings} />}
      {currentTab === "users" && (
        <UserManagement
          initialUsers={users}
          categories={categories}
          initialTechnicianCategoryMap={technicianCategoryMap}
        />
      )}
    </div>
  );
}
