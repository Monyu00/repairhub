"use client";

import { useState, useTransition } from "react";

import { ArrowDown, ArrowUp, Edit2, Plus } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import {
  type CategoryItem,
  createCategory,
  renameCategory,
  swapCategoryOrder,
  toggleCategoryActive,
} from "../_actions/category-actions";
import { CategoryDialog } from "./category-dialog";

interface CategoryManagementProps {
  initialCategories: CategoryItem[];
}

export function CategoryManagement({ initialCategories }: CategoryManagementProps) {
  const [categories, setCategories] = useState<CategoryItem[]>(initialCategories);
  const [isPending, startTransition] = useTransition();

  // Dialog State
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"create" | "rename">("create");
  const [selectedCategory, setSelectedCategory] = useState<CategoryItem | null>(null);

  // Sync state if server props update
  if (initialCategories !== categories && !isPending) {
    setCategories(initialCategories);
  }

  const handleCreateOpen = () => {
    setDialogMode("create");
    setSelectedCategory(null);
    setDialogOpen(true);
  };

  const handleRenameOpen = (category: CategoryItem) => {
    setDialogMode("rename");
    setSelectedCategory(category);
    setDialogOpen(true);
  };

  const handleDialogSubmit = async (name: string) => {
    if (dialogMode === "create") {
      const res = await createCategory(name);
      if (res.success) {
        toast.success("類別新增成功");
      }
      return res;
    }

    if (dialogMode === "rename" && selectedCategory) {
      const res = await renameCategory(selectedCategory.id, name);
      if (res.success) {
        toast.success("類別名稱已更新");
      }
      return res;
    }

    return { success: false, error: "無效的操作標的" };
  };

  const handleToggleActive = (category: CategoryItem, checked: boolean) => {
    // Optimistic update
    setCategories((prev) => prev.map((item) => (item.id === category.id ? { ...item, is_active: checked } : item)));

    startTransition(async () => {
      const res = await toggleCategoryActive(category.id, checked);
      if (!res.success) {
        toast.error(res.error ?? "更新失敗");
        // Revert on error
        setCategories((prev) =>
          prev.map((item) => (item.id === category.id ? { ...item, is_active: !checked } : item)),
        );
      } else {
        toast.success(checked ? `已啟用「${category.name}」` : `已停用「${category.name}」`);
      }
    });
  };

  const handleMove = (currentIndex: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= categories.length) return;

    const item1 = categories[currentIndex];
    const item2 = categories[targetIndex];

    // Optimistic swap
    const nextCategories = [...categories];
    const tempSortOrder = item1.sort_order;
    item1.sort_order = item2.sort_order;
    item2.sort_order = tempSortOrder;

    nextCategories[currentIndex] = item2;
    nextCategories[targetIndex] = item1;
    setCategories(nextCategories);

    startTransition(async () => {
      const res = await swapCategoryOrder(
        { id: item1.id, sort_order: item2.sort_order },
        { id: item2.id, sort_order: item1.sort_order },
      );
      if (!res.success) {
        toast.error(res.error ?? "調整排序失敗");
        setCategories(initialCategories);
      }
    });
  };

  return (
    <Card className="border-border/60 shadow-xs">
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className="text-xl">報修類別列表</CardTitle>
          <CardDescription className="mt-1 text-sm text-muted-foreground">
            管理前端報修表單顯示的故障類別項目、調整排序或設定停用狀態。
          </CardDescription>
        </div>
        <Button onClick={handleCreateOpen} className="shrink-0 gap-1.5">
          <Plus className="h-4 w-4" />
          新增類別
        </Button>
      </CardHeader>
      <CardContent>
        {categories.length === 0 ? (
          <div className="flex h-32 flex-col items-center justify-center rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
            目前尚未建立任何報修類別。
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px] text-center">排序</TableHead>
                  <TableHead>類別名稱</TableHead>
                  <TableHead className="w-[120px]">狀態</TableHead>
                  <TableHead className="w-[120px] text-center">啟用 / 停用</TableHead>
                  <TableHead className="w-[100px] text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.map((category, index) => {
                  const isFirst = index === 0;
                  const isLast = index === categories.length - 1;

                  return (
                    <TableRow key={category.id}>
                      <TableCell className="text-center font-mono text-xs">
                        <div className="flex items-center justify-center gap-1">
                          <span className="w-5 text-muted-foreground">{index + 1}</span>
                          <div className="flex flex-col gap-0.5">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              disabled={isFirst || isPending}
                              onClick={() => handleMove(index, "up")}
                              title="向上移動"
                            >
                              <ArrowUp className="h-3.5 w-3.5" />
                              <span className="sr-only">向上</span>
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              disabled={isLast || isPending}
                              onClick={() => handleMove(index, "down")}
                              title="向下移動"
                            >
                              <ArrowDown className="h-3.5 w-3.5" />
                              <span className="sr-only">向下</span>
                            </Button>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium text-foreground">{category.name}</TableCell>
                      <TableCell>
                        {category.is_active ? (
                          <Badge variant="default" className="bg-emerald-600 dark:bg-emerald-700">
                            啟用中
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-muted-foreground">
                            已停用
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <Switch
                          checked={category.is_active}
                          onCheckedChange={(checked) => handleToggleActive(category, checked)}
                          disabled={isPending}
                          aria-label={`切換 ${category.name} 狀態`}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleRenameOpen(category)}
                          disabled={isPending}
                          title="重命名類別"
                        >
                          <Edit2 className="h-4 w-4" />
                          <span className="sr-only">重命名</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      <CategoryDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        mode={dialogMode}
        initialName={selectedCategory?.name ?? ""}
        onSubmit={handleDialogSubmit}
      />
    </Card>
  );
}
