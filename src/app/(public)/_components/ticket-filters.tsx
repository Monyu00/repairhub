"use client";

import { useEffect, useState, useTransition } from "react";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { RotateCcw, Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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

export function TicketFilters({ buildings, categories }: TicketFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [_isPending, startTransition] = useTransition();

  const currentQ = searchParams.get("q") ?? "";
  const currentStatus = searchParams.get("status") ?? "all";
  const currentBuilding = searchParams.get("building") ?? "all";
  const currentCategory = searchParams.get("category") ?? "all";

  const [searchValue, setSearchValue] = useState(currentQ);

  useEffect(() => {
    setSearchValue(currentQ);
  }, [currentQ]);

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

  const hasActiveFilters =
    Boolean(currentQ) || currentStatus !== "all" || currentBuilding !== "all" || currentCategory !== "all";

  const handleReset = () => {
    setSearchValue("");
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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Search input */}
        <form onSubmit={handleSearchSubmit} className="relative flex-1">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            placeholder="搜尋報修單號或描述..."
            className="h-9 pr-8 pl-9"
          />
          {searchValue && (
            <button
              type="button"
              onClick={() => {
                setSearchValue("");
                updateFilters({ q: null });
              }}
              className="absolute top-1/2 right-2.5 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="size-3.5" />
            </button>
          )}
        </form>

        {/* Dropdowns */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Status filter */}
          <Select value={currentStatus} onValueChange={(val) => updateFilters({ status: val })}>
            <SelectTrigger className="h-9 w-full text-xs sm:w-[125px]">
              <SelectValue placeholder="所有狀態" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">所有未結案</SelectItem>
              <SelectItem value="pending">待處理</SelectItem>
              <SelectItem value="in_progress">維修中</SelectItem>
              <SelectItem value="completed">已完工</SelectItem>
            </SelectContent>
          </Select>

          {/* Building filter */}
          <Select value={currentBuilding} onValueChange={(val) => updateFilters({ building: val })}>
            <SelectTrigger className="h-9 w-full text-xs sm:w-[135px]">
              <SelectValue placeholder="所有大樓" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">所有大樓</SelectItem>
              {buildings.map((b) => (
                <SelectItem key={b.id} value={b.id}>
                  {b.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Category filter */}
          <Select value={currentCategory} onValueChange={(val) => updateFilters({ category: val })}>
            <SelectTrigger className="h-9 w-full text-xs sm:w-[135px]">
              <SelectValue placeholder="所有類別" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">所有類別</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Reset button */}
          {hasActiveFilters && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleReset}
              className="h-9 px-2.5 text-muted-foreground text-xs hover:text-foreground"
            >
              <RotateCcw className="mr-1 size-3.5" />
              重置
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
