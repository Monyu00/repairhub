"use client";

import { Tag } from "lucide-react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import type { CategoryItem } from "../_actions/category-actions";
import { CategoryManagement } from "./category-management";

interface SettingsPageProps {
  categories: CategoryItem[];
}

export function SettingsPage({ categories }: SettingsPageProps) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">系統設定</h1>
        <p className="text-sm text-muted-foreground">管理系統維護與核心參數設定</p>
      </div>

      <Tabs defaultValue="categories" className="w-full space-y-6">
        <TabsList className="w-full justify-start sm:w-auto">
          <TabsTrigger value="categories" className="gap-2">
            <Tag className="h-4 w-4" />
            類別管理
          </TabsTrigger>
        </TabsList>

        <TabsContent value="categories" className="mt-0">
          <CategoryManagement initialCategories={categories} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
