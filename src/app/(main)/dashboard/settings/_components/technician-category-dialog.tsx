"use client";

import { useEffect, useState, useTransition } from "react";

import { CheckSquare, Loader2, Square, Wrench } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

import type { CategoryItem } from "../_actions/category-actions";
import { fetchTechnicianCategories, updateTechnicianCategories } from "../_actions/technician-category-actions";
import type { UserItem } from "../_actions/user-actions";

interface TechnicianCategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserItem | null;
  categories: CategoryItem[];
  onSuccess?: (technicianId: string, updatedCategoryIds: string[]) => void;
}

export function TechnicianCategoryDialog({
  open,
  onOpenChange,
  user,
  categories,
  onSuccess,
}: TechnicianCategoryDialogProps) {
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (open && user) {
      setError(null);
      setIsLoading(true);
      void fetchTechnicianCategories(user.id).then((res) => {
        setIsLoading(false);
        if (res.success) {
          setSelectedCategoryIds(res.categoryIds);
        } else {
          setError(res.error ?? "無法載入此技師的類別訂閱");
        }
      });
    }
  }, [open, user]);

  if (!user) return null;

  const activeCategories = categories.filter((c) => c.is_active);
  const allSelected = activeCategories.length > 0 && activeCategories.every((c) => selectedCategoryIds.includes(c.id));

  const handleToggleCategory = (categoryId: string, checked: boolean) => {
    if (checked) {
      setSelectedCategoryIds((prev) => [...prev, categoryId]);
    } else {
      setSelectedCategoryIds((prev) => prev.filter((id) => id !== categoryId));
    }
  };

  const handleToggleAll = () => {
    if (allSelected) {
      setSelectedCategoryIds([]);
    } else {
      setSelectedCategoryIds(activeCategories.map((c) => c.id));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const res = await updateTechnicianCategories(user.id, selectedCategoryIds);
      if (res.success) {
        if (onSuccess) {
          onSuccess(user.id, selectedCategoryIds);
        }
        onOpenChange(false);
      } else {
        setError(res.error ?? "更新類別失敗");
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wrench className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              設定技師負責報修類別
            </DialogTitle>
            <DialogDescription>
              維護技師 <span className="font-medium text-foreground">{user.displayName ?? user.email}</span>{" "}
              擅長與負責的專業類別。接單系統將依據此設定進行排單。
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Quick Actions Header */}
            <div className="flex items-center justify-between border-b pb-2">
              <div className="text-muted-foreground text-xs">
                已選擇 <span className="font-semibold text-foreground">{selectedCategoryIds.length}</span> /{" "}
                {activeCategories.length} 個類別
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-muted-foreground text-xs hover:text-foreground"
                onClick={handleToggleAll}
                disabled={isLoading || isPending || activeCategories.length === 0}
              >
                {allSelected ? (
                  <>
                    <Square className="mr-1.5 h-3.5 w-3.5" />
                    取消全選
                  </>
                ) : (
                  <>
                    <CheckSquare className="mr-1.5 h-3.5 w-3.5 text-primary" />
                    全選類別
                  </>
                )}
              </Button>
            </div>

            {/* Loading / Category List */}
            {isLoading ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                <Loader2 className="mr-2 h-5 w-5 animate-spin text-primary" />
                <span className="text-sm">載入中...</span>
              </div>
            ) : activeCategories.length === 0 ? (
              <div className="py-6 text-center text-muted-foreground text-sm">目前系統無啟用的報修類別</div>
            ) : (
              <div className="grid max-h-[280px] grid-cols-1 gap-2.5 overflow-y-auto pr-1">
                {activeCategories.map((cat) => {
                  const isChecked = selectedCategoryIds.includes(cat.id);
                  const checkboxId = `cat-check-${cat.id}`;
                  return (
                    <div
                      key={cat.id}
                      className={`flex items-center space-x-3 rounded-lg border p-3 transition-colors ${
                        isChecked ? "border-primary/40 bg-primary/5" : "border-border hover:bg-muted/50"
                      }`}
                    >
                      <Checkbox
                        id={checkboxId}
                        checked={isChecked}
                        onCheckedChange={(checked) => handleToggleCategory(cat.id, checked === true)}
                        disabled={isPending}
                      />
                      <Label
                        htmlFor={checkboxId}
                        className="flex flex-1 cursor-pointer items-center justify-between font-normal"
                      >
                        <span className="font-medium text-foreground text-sm">{cat.name}</span>
                        {isChecked && (
                          <Badge variant="secondary" className="h-4 px-1.5 py-0 text-[10px]">
                            已負責
                          </Badge>
                        )}
                      </Label>
                    </div>
                  );
                })}
              </div>
            )}

            {error && (
              <div className="rounded-md bg-destructive/10 p-3 font-medium text-destructive text-xs">{error}</div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending || isLoading}
            >
              取消
            </Button>
            <Button type="submit" disabled={isPending || isLoading}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              儲存變更
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
