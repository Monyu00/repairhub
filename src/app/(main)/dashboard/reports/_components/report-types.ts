export type DateRangePreset = "30d" | "90d" | "6m" | "1y" | "all" | "custom";

export interface DateRangeFilterState {
  preset: DateRangePreset;
  from?: string; // YYYY-MM-DD
  to?: string; // YYYY-MM-DD
}

export interface MonthlyTicketStat {
  month: string; // e.g. "2026-03" or "3月"
  total: number;
  completed: number;
  pendingOrProgress: number;
}

export interface BuildingDistributionStat {
  buildingId: string;
  buildingName: string;
  buildingCode: string;
  count: number;
  percentage: number;
  fill?: string;
}

export interface CategoryDistributionStat {
  categoryId: string;
  categoryName: string;
  count: number;
  percentage: number;
  fill?: string;
}

export interface AvgResolutionTimeStat {
  month: string;
  avgHours: number;
  avgDays: number;
  completedCount: number;
}

export interface TechnicianPerformanceStat {
  technicianId: string;
  displayName: string;
  completedCount: number;
  inProgressCount: number;
  avgDaysToResolve: number;
}

export interface ReportKpiSummary {
  totalTickets: number;
  completedOrClosedCount: number;
  pendingCount: number;
  inProgressCount: number;
  completionRate: number; // percentage, e.g. 85.5
  overallAvgDaysToResolve: number;
  activePeriodLabel: string;
}

export interface ReportData {
  kpi: ReportKpiSummary;
  monthlyTrends: MonthlyTicketStat[];
  buildingDistribution: BuildingDistributionStat[];
  categoryDistribution: CategoryDistributionStat[];
  resolutionTrends: AvgResolutionTimeStat[];
  technicianPerformance: TechnicianPerformanceStat[];
  filter: DateRangeFilterState;
}
