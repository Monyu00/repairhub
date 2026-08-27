"use client";

import { useRouter } from "next/navigation";

import { MapPin, Tag, Users } from "lucide-react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
  const router = useRouter();
  const currentTab = ["categories", "locations", "users"].includes(defaultTab) ? defaultTab : "categories";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">系統設定</h1>
        <p className="text-sm text-muted-foreground">管理系統維護與核心參數設定</p>
      </div>

      <Tabs
        value={currentTab}
        onValueChange={(nextTab) => router.replace(`/dashboard/settings?tab=${nextTab}`, { scroll: false })}
        className="w-full space-y-6"
      >
        <TabsList className="w-full justify-start sm:w-auto">
          <TabsTrigger value="categories" className="gap-2 cursor-pointer">
            <Tag className="h-4 w-4" />
            類別管理
          </TabsTrigger>
          <TabsTrigger value="locations" className="gap-2 cursor-pointer">
            <MapPin className="h-4 w-4" />
            地點管理
          </TabsTrigger>
          <TabsTrigger value="users" className="gap-2 cursor-pointer">
            <Users className="h-4 w-4" />
            使用者管理
          </TabsTrigger>
        </TabsList>

        <TabsContent value="categories" className="mt-0">
          <CategoryManagement initialCategories={categories} />
        </TabsContent>

        <TabsContent value="locations" className="mt-0">
          <LocationManagement initialBuildings={buildings} />
        </TabsContent>

        <TabsContent value="users" className="mt-0">
          <UserManagement
            initialUsers={users}
            categories={categories}
            initialTechnicianCategoryMap={technicianCategoryMap}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
