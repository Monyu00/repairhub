"use client";

import { CheckCircle2, Clock, FileSpreadsheet, Hourglass, TrendingUp } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

import { AvgResolutionChart } from "./avg-resolution-chart";
import { BuildingDistributionChart } from "./building-distribution-chart";
import { CategoryDistributionChart } from "./category-distribution-chart";
import { DateRangeFilter } from "./date-range-filter";
import { MonthlyTicketsChart } from "./monthly-tickets-chart";
import type { ReportData } from "./report-types";
import { TechnicianPerformanceChart } from "./technician-performance-chart";

interface ReportsDashboardProps {
  initialData: ReportData;
}

export function ReportsDashboard({ initialData }: ReportsDashboardProps) {
  const {
    kpi,
    monthlyTrends,
    buildingDistribution,
    categoryDistribution,
    resolutionTrends,
    technicianPerformance,
    filter,
  } = initialData;

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-bold text-2xl text-foreground tracking-tight">統計報表與分析</h1>
          <p className="text-muted-foreground text-sm">全校報修趨勢、空間分佈、分類佔比與維修績效深度分析</p>
        </div>
      </div>

      {/* Date Range Filter Bar */}
      <DateRangeFilter currentFilter={filter} />

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Tickets */}
        <Card className="p-4 shadow-xs">
          <CardContent className="flex items-center justify-between p-0">
            <div className="space-y-1">
              <p className="font-medium text-muted-foreground text-xs">期間工單總數</p>
              <div className="font-bold text-2xl text-foreground tabular-nums tracking-tight">
                {kpi.totalTickets} <span className="font-normal text-muted-foreground text-xs">件</span>
              </div>
              <p className="text-[11px] text-muted-foreground">{kpi.activePeriodLabel}</p>
            </div>
            <div className="rounded-xl bg-primary/10 p-2.5 text-primary">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        {/* Completion Rate */}
        <Card className="p-4 shadow-xs">
          <CardContent className="flex items-center justify-between p-0">
            <div className="space-y-1">
              <p className="font-medium text-muted-foreground text-xs">已完成/結案率</p>
              <div className="font-bold text-2xl text-foreground tabular-nums tracking-tight">
                {kpi.completionRate}%
              </div>
              <p className="flex items-center gap-0.5 text-[11px] text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="inline h-3 w-3" />共 {kpi.completedOrClosedCount} 件結案
              </p>
            </div>
            <div className="rounded-xl bg-emerald-500/10 p-2.5 text-emerald-500">
              <TrendingUp className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        {/* Average Resolution Days */}
        <Card className="p-4 shadow-xs">
          <CardContent className="flex items-center justify-between p-0">
            <div className="space-y-1">
              <p className="font-medium text-muted-foreground text-xs">平均修復時間</p>
              <div className="font-bold text-2xl text-foreground tabular-nums tracking-tight">
                {kpi.overallAvgDaysToResolve} <span className="font-normal text-muted-foreground text-xs">天</span>
              </div>
              <p className="text-[11px] text-muted-foreground">通報至完工平均耗時</p>
            </div>
            <div className="rounded-xl bg-amber-500/10 p-2.5 text-amber-500">
              <Clock className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        {/* Pending & In Progress */}
        <Card className="p-4 shadow-xs">
          <CardContent className="flex items-center justify-between p-0">
            <div className="space-y-1">
              <p className="font-medium text-muted-foreground text-xs">待處理與進行中</p>
              <div className="font-bold text-2xl text-foreground tabular-nums tracking-tight">
                {kpi.pendingCount + kpi.inProgressCount}{" "}
                <span className="font-normal text-muted-foreground text-xs">件</span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                待處理 {kpi.pendingCount} | 進行中 {kpi.inProgressCount}
              </p>
            </div>
            <div className="rounded-xl bg-blue-500/10 p-2.5 text-blue-500">
              <Hourglass className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="space-y-6">
        {/* Row 1: Volume Trend & Resolution Trend */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <MonthlyTicketsChart data={monthlyTrends} />
          <AvgResolutionChart data={resolutionTrends} />
        </div>

        {/* Row 2: Building & Category Distribution */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <BuildingDistributionChart data={buildingDistribution} />
          <CategoryDistributionChart data={categoryDistribution} />
        </div>

        {/* Row 3: Technician Performance */}
        <div>
          <TechnicianPerformanceChart data={technicianPerformance} />
        </div>
      </div>
    </div>
  );
}
