"use client";

import { useTransition } from "react";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { Calendar as CalendarIcon, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import type { DateRangeFilterState, DateRangePreset } from "./report-types";

interface DateRangeFilterProps {
  currentFilter: DateRangeFilterState;
}

const PRESET_OPTIONS: { id: DateRangePreset; label: string }[] = [
  { id: "30d", label: "近 30 天" },
  { id: "90d", label: "近 90 天" },
  { id: "6m", label: "近 6 個月" },
  { id: "1y", label: "近 1 年" },
  { id: "all", label: "全部歷史" },
];

export function DateRangeFilter({ currentFilter }: DateRangeFilterProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const handlePresetChange = (preset: DateRangePreset) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("range", preset);
    params.delete("from");
    params.delete("to");

    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  };

  const handleCustomDateApply = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const from = formData.get("from") as string;
    const to = formData.get("to") as string;

    const params = new URLSearchParams(searchParams.toString());
    params.set("range", "custom");
    if (from) params.set("from", from);
    else params.delete("from");

    if (to) params.set("to", to);
    else params.delete("to");

    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  };

  const handleReset = () => {
    startTransition(() => {
      router.push(pathname);
    });
  };

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border/50 bg-card/60 p-3 shadow-xs backdrop-blur-xs sm:flex-row sm:items-center sm:justify-between">
      {/* Preset Buttons */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="mr-1 flex items-center gap-1 font-medium text-muted-foreground text-xs">
          <CalendarIcon className="h-3.5 w-3.5" />
          時間區間：
        </span>
        {PRESET_OPTIONS.map((opt) => {
          const isActive = currentFilter.preset === opt.id;
          return (
            <Button
              key={opt.id}
              type="button"
              variant={isActive ? "default" : "outline"}
              size="sm"
              className="h-8 font-normal text-xs transition-all"
              disabled={isPending}
              onClick={() => handlePresetChange(opt.id)}
            >
              {opt.label}
            </Button>
          );
        })}
      </div>

      {/* Custom Date Form */}
      <form onSubmit={handleCustomDateApply} className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1.5">
          <Input
            type="date"
            name="from"
            defaultValue={currentFilter.from ?? ""}
            className="h-8 w-34 text-xs"
            disabled={isPending}
          />
          <span className="text-muted-foreground text-xs">至</span>
          <Input
            type="date"
            name="to"
            defaultValue={currentFilter.to ?? ""}
            className="h-8 w-34 text-xs"
            disabled={isPending}
          />
        </div>
        <Button type="submit" variant="secondary" size="sm" className="h-8 text-xs" disabled={isPending}>
          自訂查詢
        </Button>
        {(currentFilter.preset !== "1y" || Boolean(currentFilter.from) || Boolean(currentFilter.to)) && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={handleReset}
            title="重設篩選"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>
        )}
      </form>
    </div>
  );
}
