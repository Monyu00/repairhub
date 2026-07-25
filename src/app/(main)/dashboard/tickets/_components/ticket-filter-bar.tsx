"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useTransition } from "react";
import { CalendarIcon, FilterX, SlidersHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { FilterOptions, TicketStatus } from "./ticket-types";
import { STATUS_CONFIG } from "./ticket-status-badge";

const ALL_STATUSES: TicketStatus[] = ["pending", "in_progress", "completed", "closed", "cancelled"];

interface TicketFilterBarProps {
  filterOptions: FilterOptions;
}

export function TicketFilterBar({ filterOptions }: TicketFilterBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const selectedStatuses = searchParams.get("status")?.split(",").filter(Boolean) as TicketStatus[] ?? [];
  const selectedCategory = searchParams.get("category") ?? "all";
  const selectedBuilding = searchParams.get("building") ?? "all";
  const fromDateStr = searchParams.get("from") ?? "";
  const toDateStr = searchParams.get("to") ?? "";

  const updateQueryParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());

      // Reset pagination to page 1 on filter change if not updating page directly
      if (!("page" in updates)) {
        params.delete("page");
      }

      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === "" || value === "all") {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      }

      startTransition(() => {
        router.push(`${pathname}?${params.toString()}`);
      });
    },
    [pathname, router, searchParams],
  );

  const handleStatusToggle = (status: TicketStatus) => {
    let next: TicketStatus[];
    if (selectedStatuses.includes(status)) {
      next = selectedStatuses.filter((s) => s !== status);
    } else {
      next = [...selectedStatuses, status];
    }
    updateQueryParams({ status: next.length > 0 ? next.join(",") : null });
  };

  const handleCategoryChange = (val: string) => {
    updateQueryParams({ category: val });
  };

  const handleBuildingChange = (val: string) => {
    updateQueryParams({ building: val });
  };

  const handleResetFilters = () => {
    startTransition(() => {
      router.push(pathname);
    });
  };

  const activeFilterCount =
    (selectedStatuses.length > 0 ? 1 : 0) +
    (selectedCategory !== "all" ? 1 : 0) +
    (selectedBuilding !== "all" ? 1 : 0) +
    (fromDateStr ? 1 : 0) +
    (toDateStr ? 1 : 0);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card/60 p-3.5 shadow-xs backdrop-blur-xs">
      <div className="flex flex-wrap items-center gap-2.5">
        {/* Status Multi-Select Popover */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 gap-1.5 border-dashed">
              <SlidersHorizontal className="size-3.5 text-muted-foreground" />
              <span>狀態</span>
              {selectedStatuses.length > 0 && (
                <span className="ml-1 rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-medium text-primary-foreground">
                  {selectedStatuses.length}
                </span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-48 p-3" align="start">
            <div className="space-y-2">
              <div className="font-medium text-xs text-muted-foreground pb-1 border-b">篩選狀態</div>
              {ALL_STATUSES.map((status) => {
                const isChecked = selectedStatuses.includes(status);
                return (
                  <label
                    key={status}
                    className="flex cursor-pointer items-center gap-2 rounded-md p-1.5 text-xs hover:bg-muted transition-colors"
                  >
                    <Checkbox
                      checked={isChecked}
                      onCheckedChange={() => handleStatusToggle(status)}
                      id={`status-${status}`}
                    />
                    <span>{STATUS_CONFIG[status].label}</span>
                  </label>
                );
              })}
            </div>
          </PopoverContent>
        </Popover>

        {/* Category Dropdown */}
        <Select value={selectedCategory} onValueChange={handleCategoryChange}>
          <SelectTrigger size="sm" className="h-8 min-w-32">
            <SelectValue placeholder="所有類別" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">所有類別</SelectItem>
            {filterOptions.categories.map((cat) => (
              <SelectItem key={cat.id} value={cat.id}>
                {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Building Dropdown */}
        <Select value={selectedBuilding} onValueChange={handleBuildingChange}>
          <SelectTrigger size="sm" className="h-8 min-w-32">
            <SelectValue placeholder="所有大樓" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">所有大樓</SelectItem>
            {filterOptions.buildings.map((bldg) => (
              <SelectItem key={bldg.id} value={bldg.id}>
                {bldg.name} ({bldg.code})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Date Filter Popover */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 gap-1.5 border-dashed">
              <CalendarIcon className="size-3.5 text-muted-foreground" />
              <span>
                {fromDateStr || toDateStr
                  ? `${fromDateStr || "不限"} ~ ${toDateStr || "不限"}`
                  : "日期區間"}
              </span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-3" align="start">
            <div className="space-y-3">
              <div className="font-medium text-xs text-muted-foreground pb-1 border-b">日期條件</div>
              <div className="grid gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-12 text-muted-foreground">起始日:</span>
                  <input
                    type="date"
                    value={fromDateStr}
                    onChange={(e) => updateQueryParams({ from: e.target.value || null })}
                    className="rounded border border-input px-2 py-1 text-xs bg-background"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-12 text-muted-foreground">結束日:</span>
                  <input
                    type="date"
                    value={toDateStr}
                    onChange={(e) => updateQueryParams({ to: e.target.value || null })}
                    className="rounded border border-input px-2 py-1 text-xs bg-background"
                  />
                </div>
              </div>
              {(fromDateStr || toDateStr) && (
                <Button
                  variant="ghost"
                  size="xs"
                  className="w-full text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => updateQueryParams({ from: null, to: null })}
                >
                  清除日期條件
                </Button>
              )}
            </div>
          </PopoverContent>
        </Popover>

        {/* Clear All Filters Button */}
        {activeFilterCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleResetFilters}
            className="h-8 gap-1 text-muted-foreground hover:text-foreground px-2"
          >
            <FilterX className="size-3.5" />
            <span>清除篩選 ({activeFilterCount})</span>
          </Button>
        )}
      </div>

      {isPending && <span className="text-xs text-muted-foreground animate-pulse">更新中...</span>}
    </div>
  );
}
