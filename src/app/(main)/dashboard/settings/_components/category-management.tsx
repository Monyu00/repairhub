"use client";

import { useState, useTransition } from "react";

import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Edit2, GripVertical, Plus } from "lucide-react";
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
  reorderCategories,
  toggleCategoryActive,
} from "../_actions/category-actions";
import { CategoryDialog } from "./category-dialog";

interface CategoryManagementProps {
  initialCategories: CategoryItem[];
}

interface SortableCategoryRowProps {
  category: CategoryItem;
  index: number;
  isPending: boolean;
  onToggleActive: (category: CategoryItem, checked: boolean) => void;
  onRenameOpen: (category: CategoryItem) => void;
}

function SortableCategoryRow({ category, index, isPending, onToggleActive, onRenameOpen }: SortableCategoryRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: category.id,
  });

  const style: React.CSSProperties = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    transition,
    opacity: isDragging ? 0.6 : 1,
    zIndex: isDragging ? 10 : 1,
    position: isDragging ? "relative" : undefined,
    backgroundColor: isDragging ? "var(--muted)" : undefined,
  };

  return (
    <TableRow ref={setNodeRef} style={style}>
      <TableCell className="w-[100px] text-center font-mono text-xs">
        <div className="flex items-center justify-center gap-1.5">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 cursor-grab touch-none text-muted-foreground hover:text-foreground active:cursor-grabbing"
            {...attributes}
            {...listeners}
            disabled={isPending}
            title="拖拉調整順序"
          >
            <GripVertical className="h-4 w-4" />
            <span className="sr-only">拖拉調整順序</span>
          </Button>
          <span className="w-4 text-muted-foreground">{index + 1}</span>
        </div>
      </TableCell>
      <TableCell className="font-medium text-foreground">{category.name}</TableCell>
      <TableCell className="w-[120px]">
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
      <TableCell className="w-[120px] text-center">
        <Switch
          checked={category.is_active}
          onCheckedChange={(checked) => onToggleActive(category, checked)}
          disabled={isPending}
          aria-label={`切換 ${category.name} 狀態`}
        />
      </TableCell>
      <TableCell className="w-[100px] text-right">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => onRenameOpen(category)}
          disabled={isPending}
          title="重命名類別"
        >
          <Edit2 className="h-4 w-4" />
          <span className="sr-only">重命名</span>
        </Button>
      </TableCell>
    </TableRow>
  );
}

export function CategoryManagement({ initialCategories }: CategoryManagementProps) {
  const [categories, setCategories] = useState<CategoryItem[]>(initialCategories);
  const [isPending, startTransition] = useTransition();

  // Dialog State
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"create" | "rename">("create");
  const [selectedCategory, setSelectedCategory] = useState<CategoryItem | null>(null);

  // Configure Sensors for Dragging
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 4,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

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

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = categories.findIndex((c) => c.id === active.id);
      const newIndex = categories.findIndex((c) => c.id === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        const nextCategories = arrayMove(categories, oldIndex, newIndex);
        setCategories(nextCategories);

        const orderedIds = nextCategories.map((c) => c.id);
        startTransition(async () => {
          const res = await reorderCategories(orderedIds);
          if (!res.success) {
            toast.error(res.error ?? "調整排序失敗");
            setCategories(initialCategories);
          } else {
            toast.success("排序已更新");
          }
        });
      }
    }
  };

  return (
    <Card className="border-border/60 shadow-xs">
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className="text-xl">報修類別列表</CardTitle>
          <CardDescription className="mt-1 text-sm text-muted-foreground">
            管理前端報修表單顯示的故障類別項目，可按住左側圖示拖拉調整顯示順序或設定啟用狀態。
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
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              modifiers={[restrictToVerticalAxis]}
              onDragEnd={handleDragEnd}
            >
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
                  <SortableContext items={categories.map((c) => c.id)} strategy={verticalListSortingStrategy}>
                    {categories.map((category, index) => (
                      <SortableCategoryRow
                        key={category.id}
                        category={category}
                        index={index}
                        isPending={isPending}
                        onToggleActive={handleToggleActive}
                        onRenameOpen={handleRenameOpen}
                      />
                    ))}
                  </SortableContext>
                </TableBody>
              </Table>
            </DndContext>
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
