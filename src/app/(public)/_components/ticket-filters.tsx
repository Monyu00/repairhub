"use client";

import { useEffect, useState, useTransition } from "react";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { RotateCcw, Search, SlidersHorizontal, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/components/ui/input-group";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";

interface BuildingOption {
  id: string;
  name: string;
  code: string;
}

interface CategoryOption {
  id: string;
  name: string;
}

interface TicketFiltersProps {
  buildings: BuildingOption[];
  categories: CategoryOption[];
}

interface FilterDraft {
  status: string;
  building: string;
  category: string;
}

interface FilterSelectsProps {
  idPrefix: string;
  values: FilterDraft;
  buildings: BuildingOption[];
  categories: CategoryOption[];
  showLabels: boolean;
  onValueChange: (key: keyof FilterDraft, value: string) => void;
}

const EMPTY_FILTER_DRAFT: FilterDraft = {
  status: "all",
  building: "all",
  category: "all",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "待處理",
  in_progress: "維修中",
  completed: "已完工",
};

function FilterSelects({ idPrefix, values, buildings, categories, showLabels, onValueChange }: FilterSelectsProps) {
  const fieldClassName = showLabels ? undefined : "w-auto";
  const labelClassName = showLabels ? undefined : "sr-only";
  const statusWidth = showLabels ? "w-full" : "w-full md:w-[125px]";
  const buildingWidth = showLabels ? "w-full" : "w-full md:w-[135px]";
  const categoryWidth = showLabels ? "w-full" : "w-full md:w-[135px]";

  return (
    <FieldGroup className={showLabels ? "gap-4" : "flex-row flex-wrap gap-2 md:w-[411px]"}>
      <Field className={fieldClassName}>
        <FieldLabel htmlFor={`${idPrefix}-status`} className={labelClassName}>
          狀態
        </FieldLabel>
        <Select value={values.status} onValueChange={(value) => onValueChange("status", value)}>
          <SelectTrigger
            id={`${idPrefix}-status`}
            aria-label="報修單狀態"
            className={`h-11! text-xs md:h-9! ${statusWidth}`}
          >
            <SelectValue placeholder="所有狀態" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="all">所有未結案</SelectItem>
              <SelectItem value="pending">待處理</SelectItem>
              <SelectItem value="in_progress">維修中</SelectItem>
              <SelectItem value="completed">已完工</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      </Field>

      <Field className={fieldClassName}>
        <FieldLabel htmlFor={`${idPrefix}-building`} className={labelClassName}>
          地點
        </FieldLabel>
        <Select value={values.building} onValueChange={(value) => onValueChange("building", value)}>
          <SelectTrigger
            id={`${idPrefix}-building`}
            aria-label="報修地點"
            className={`h-11! text-xs md:h-9! ${buildingWidth}`}
          >
            <SelectValue placeholder="所有地點" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="all">所有地點</SelectItem>
              {buildings.map((building) => (
                <SelectItem key={building.id} value={building.id}>
                  {building.name}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </Field>

      <Field className={fieldClassName}>
        <FieldLabel htmlFor={`${idPrefix}-category`} className={labelClassName}>
          類別
        </FieldLabel>
        <Select value={values.category} onValueChange={(value) => onValueChange("category", value)}>
          <SelectTrigger
            id={`${idPrefix}-category`}
            aria-label="報修類別"
            className={`h-11! text-xs md:h-9! ${categoryWidth}`}
          >
            <SelectValue placeholder="所有類別" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="all">所有類別</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </Field>
    </FieldGroup>
  );
}

export function TicketFilters({ buildings, categories }: TicketFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const currentQ = searchParams.get("q") ?? "";
  const currentStatus = searchParams.get("status") ?? "all";
  const currentBuilding = searchParams.get("building") ?? "all";
  const currentCategory = searchParams.get("category") ?? "all";

  const [searchValue, setSearchValue] = useState(currentQ);
  const [filterOpen, setFilterOpen] = useState(false);
  const [draft, setDraft] = useState<FilterDraft>({
    status: currentStatus,
    building: currentBuilding,
    category: currentCategory,
  });

  useEffect(() => {
    setSearchValue(currentQ);
  }, [currentQ]);

  const currentFilters: FilterDraft = {
    status: currentStatus,
    building: currentBuilding,
    category: currentCategory,
  };

  const updateFilters = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());

    // Always reset page when filter changes
    params.delete("page");

    for (const [key, value] of Object.entries(updates)) {
      if (value && value !== "all") {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    }

    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateFilters({ q: searchValue.trim() || null });
  };

  const activeFilterLabels: Array<{ key: string; label: string }> = [];

  if (currentQ) {
    activeFilterLabels.push({ key: "q", label: `搜尋：${currentQ}` });
  }
  if (currentStatus !== "all") {
    activeFilterLabels.push({ key: "status", label: STATUS_LABELS[currentStatus] ?? "狀態" });
  }
  if (currentBuilding !== "all") {
    const building = buildings.find((item) => item.id === currentBuilding);
    activeFilterLabels.push({ key: "building", label: building?.name ?? "指定地點" });
  }
  if (currentCategory !== "all") {
    const category = categories.find((item) => item.id === currentCategory);
    activeFilterLabels.push({ key: "category", label: category?.name ?? "指定類別" });
  }

  const activeSelectCount = [currentStatus, currentBuilding, currentCategory].filter((value) => value !== "all").length;

  const handleOpenFilters = () => {
    setDraft(currentFilters);
    setFilterOpen(true);
  };

  const handleApplyFilters = () => {
    setFilterOpen(false);
    updateFilters({
      status: draft.status,
      building: draft.building,
      category: draft.category,
    });
  };

  const handleReset = () => {
    setSearchValue("");
    setDraft(EMPTY_FILTER_DRAFT);
    setFilterOpen(false);
    const params = new URLSearchParams();
    const currentTab = searchParams.get("tab");
    if (currentTab) {
      params.set("tab", currentTab);
    }
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  };

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 shadow-xs">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <form onSubmit={handleSearchSubmit} className="flex min-w-0 flex-1 items-center gap-2">
          <InputGroup className="h-11 min-w-0 flex-1 sm:h-9">
            <InputGroupAddon>
              <Search aria-hidden="true" />
            </InputGroupAddon>
            <InputGroupInput
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              placeholder="搜尋報修單號或描述..."
              aria-label="搜尋報修單號或描述"
              className="h-11! sm:h-9!"
            />
            {searchValue && (
              <InputGroupAddon align="inline-end" className="pr-0">
                <InputGroupButton
                  size="icon-sm"
                  aria-label="清除搜尋"
                  className="size-11 sm:size-8"
                  onClick={() => {
                    setSearchValue("");
                    updateFilters({ q: null });
                  }}
                >
                  <X />
                </InputGroupButton>
              </InputGroupAddon>
            )}
          </InputGroup>
          <Button type="submit" size="sm" className="h-11 shrink-0 px-3 sm:h-9">
            搜尋
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-11 shrink-0 gap-1.5 px-3 md:hidden"
            onClick={handleOpenFilters}
          >
            <SlidersHorizontal data-icon="inline-start" />
            <span>篩選</span>
            {activeSelectCount > 0 && (
              <Badge variant="secondary" className="px-1.5 py-0">
                {activeSelectCount}
              </Badge>
            )}
          </Button>
        </form>

        <div className="hidden shrink-0 flex-wrap items-center gap-2 md:flex">
          <FilterSelects
            idPrefix="desktop"
            values={currentFilters}
            buildings={buildings}
            categories={categories}
            showLabels={false}
            onValueChange={(key, value) => updateFilters({ [key]: value })}
          />

          {activeFilterLabels.length > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleReset}
              className="h-9 px-2.5 text-muted-foreground text-xs hover:text-foreground"
            >
              <RotateCcw data-icon="inline-start" />
              重置
            </Button>
          )}
        </div>
      </div>

      {activeFilterLabels.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 md:hidden">
          <span className="text-muted-foreground text-xs">目前條件</span>
          {activeFilterLabels.map((filter) => (
            <Badge key={filter.key} variant="secondary" className="max-w-full truncate">
              {filter.label}
            </Badge>
          ))}
        </div>
      )}

      <Drawer open={filterOpen} onOpenChange={setFilterOpen}>
        <DrawerContent>
          <DrawerHeader className="text-left">
            <DrawerTitle>篩選報修單</DrawerTitle>
            <DrawerDescription>依狀態、地點與類別縮小公開案件範圍。</DrawerDescription>
          </DrawerHeader>

          <div className="px-4 pb-2">
            <FilterSelects
              idPrefix="mobile"
              values={draft}
              buildings={buildings}
              categories={categories}
              showLabels
              onValueChange={(key, value) => setDraft((current) => ({ ...current, [key]: value }))}
            />
          </div>

          <DrawerFooter className="flex-row">
            <Button type="button" variant="outline" className="h-11 flex-1" disabled={isPending} onClick={handleReset}>
              重設
            </Button>
            <Button type="button" className="h-11 flex-1" disabled={isPending} onClick={handleApplyFilters}>
              {isPending && <Spinner data-icon="inline-start" aria-label="正在套用篩選" />}
              套用篩選
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
