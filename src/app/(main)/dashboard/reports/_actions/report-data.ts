import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/database.types";

import type { DateRangePreset, ReportData } from "../_components/report-types";

const THEME_CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--primary)",
  "var(--muted-foreground)",
  "var(--accent-foreground)",
];

interface ReportAggregatePayload {
  kpi?: {
    total_tickets?: number;
    completed_or_closed_count?: number;
    pending_count?: number;
    in_progress_count?: number;
    completion_rate?: number;
    overall_avg_days_to_resolve?: number;
  };
  monthly_trends?: Array<{
    month: string;
    total: number;
    completed: number;
    pending_or_progress: number;
  }>;
  resolution_trends?: Array<{
    month: string;
    avg_hours: number;
    avg_days: number;
    completed_count: number;
  }>;
  building_distribution?: Array<{
    building_id: string;
    building_name: string;
    building_code: string;
    count: number;
  }>;
  campus_buildings?: Array<{
    building_id: string;
    building_code: string;
    building_name: string;
    status_counts?: {
      pending?: number;
      in_progress?: number;
      completed?: number;
      closed?: number;
      cancelled?: number;
      total?: number;
    };
  }>;
  category_distribution?: Array<{
    category_id: string;
    category_name: string;
    count: number;
  }>;
  technician_performance?: Array<{
    technician_id: string;
    display_name: string;
    completed_count: number;
    in_progress_count: number;
    avg_days_to_resolve: number;
  }>;
  satisfaction?: {
    avg_rating?: number;
    total_rated?: number;
    total_closed?: number;
    response_rate?: number;
    distribution?: Array<{ star: number; count: number }>;
    monthly_trends?: Array<{ month: string; avg_rating: number; count: number }>;
    technician_rankings?: Array<{
      technician_id: string;
      display_name: string;
      avg_rating: number;
      rated_count: number;
      completed_count: number;
    }>;
  };
}

interface ReportFilterResolution {
  preset: DateRangePreset;
  from?: string;
  to?: string;
  startDate: Date | null;
  endDate: Date | null;
  periodLabel: string;
}

const PRESETS = new Set<DateRangePreset>(["30d", "90d", "6m", "1y", "all", "custom"]);

function parseDate(value: string | undefined, endOfDay: boolean): Date | null {
  if (!value) {
    return null;
  }

  const parts = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!parts) {
    return null;
  }

  const date = new Date(`${value}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}Z`);
  if (
    Number.isNaN(date.getTime()) ||
    date.getUTCFullYear() !== Number(parts[1]) ||
    date.getUTCMonth() + 1 !== Number(parts[2]) ||
    date.getUTCDate() !== Number(parts[3])
  ) {
    return null;
  }

  return date;
}

export function resolveReportFilter(
  filterParams?: { range?: string; from?: string; to?: string },
  now = new Date(),
): ReportFilterResolution {
  const rawPreset = filterParams?.range;
  const preset = rawPreset && PRESETS.has(rawPreset as DateRangePreset) ? (rawPreset as DateRangePreset) : "1y";
  const customFrom = filterParams?.from;
  const customTo = filterParams?.to;

  if (preset === "30d") {
    return {
      preset,
      startDate: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
      endDate: null,
      periodLabel: "過去 30 天",
    };
  }

  if (preset === "90d") {
    return {
      preset,
      startDate: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000),
      endDate: null,
      periodLabel: "過去 90 天",
    };
  }

  if (preset === "6m") {
    return {
      preset,
      startDate: new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000),
      endDate: null,
      periodLabel: "過去 6 個月",
    };
  }

  if (preset === "all") {
    return {
      preset,
      startDate: null,
      endDate: null,
      periodLabel: "全部歷史紀錄",
    };
  }

  if (preset === "custom") {
    return {
      preset,
      from: customFrom,
      to: customTo,
      startDate: parseDate(customFrom, false),
      endDate: parseDate(customTo, true),
      periodLabel: `${customFrom ?? "起始"} ~ ${customTo ?? "至今"}`,
    };
  }

  return {
    preset,
    startDate: new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000),
    endDate: null,
    periodLabel: "過去 1 年",
  };
}

function emptyReportData(filter: ReportFilterResolution): ReportData {
  return {
    kpi: {
      totalTickets: 0,
      completedOrClosedCount: 0,
      pendingCount: 0,
      inProgressCount: 0,
      completionRate: 0,
      overallAvgDaysToResolve: 0,
      activePeriodLabel: filter.periodLabel,
    },
    monthlyTrends: [],
    buildingDistribution: [],
    campusBuildings: [],
    categoryDistribution: [],
    resolutionTrends: [],
    technicianPerformance: [],
    satisfaction: {
      avgRating: 0,
      totalRated: 0,
      totalClosed: 0,
      responseRate: 0,
      distribution: [5, 4, 3, 2, 1].map((star) => ({ star, count: 0, percentage: 0 })),
      monthlyTrends: [],
      technicianRankings: [],
    },
    filter: { preset: filter.preset, from: filter.from, to: filter.to },
  };
}

export async function fetchReportDataWithClient(
  supabase: SupabaseClient<Database>,
  filterParams?: { range?: string; from?: string; to?: string },
): Promise<ReportData> {
  const filter = resolveReportFilter(filterParams);
  const { data, error } = await supabase.rpc("report_aggregates", {
    p_from: filter.startDate?.toISOString() ?? null,
    p_to: filter.endDate?.toISOString() ?? null,
  });

  if (error) {
    console.error("Error fetching report aggregates:", error);
    return emptyReportData(filter);
  }

  const payload = (data ?? {}) as unknown as ReportAggregatePayload;
  const kpi = payload.kpi ?? {};
  const totalTickets = kpi.total_tickets ?? 0;
  const totalRated = payload.satisfaction?.total_rated ?? 0;

  return {
    kpi: {
      totalTickets,
      completedOrClosedCount: kpi.completed_or_closed_count ?? 0,
      pendingCount: kpi.pending_count ?? 0,
      inProgressCount: kpi.in_progress_count ?? 0,
      completionRate: kpi.completion_rate ?? 0,
      overallAvgDaysToResolve: kpi.overall_avg_days_to_resolve ?? 0,
      activePeriodLabel: filter.periodLabel,
    },
    monthlyTrends: (payload.monthly_trends ?? []).map((row) => ({
      month: row.month,
      total: row.total,
      completed: row.completed,
      pendingOrProgress: row.pending_or_progress,
    })),
    buildingDistribution: (payload.building_distribution ?? []).map((row, index) => ({
      buildingId: row.building_id,
      buildingName: row.building_name,
      buildingCode: row.building_code,
      count: row.count,
      percentage: totalTickets > 0 ? Number(((row.count / totalTickets) * 100).toFixed(1)) : 0,
      fill: THEME_CHART_COLORS[index % THEME_CHART_COLORS.length],
    })),
    campusBuildings: (payload.campus_buildings ?? []).map((row) => ({
      buildingId: row.building_id,
      buildingCode: row.building_code,
      buildingName: row.building_name,
      statusCounts: {
        pending: row.status_counts?.pending ?? 0,
        in_progress: row.status_counts?.in_progress ?? 0,
        completed: row.status_counts?.completed ?? 0,
        closed: row.status_counts?.closed ?? 0,
        cancelled: row.status_counts?.cancelled ?? 0,
        total:
          row.status_counts?.total ??
          (row.status_counts?.pending ?? 0) +
            (row.status_counts?.in_progress ?? 0) +
            (row.status_counts?.completed ?? 0) +
            (row.status_counts?.closed ?? 0) +
            (row.status_counts?.cancelled ?? 0),
      },
    })),
    categoryDistribution: (payload.category_distribution ?? []).map((row, index) => ({
      categoryId: row.category_id,
      categoryName: row.category_name,
      count: row.count,
      percentage: totalTickets > 0 ? Number(((row.count / totalTickets) * 100).toFixed(1)) : 0,
      fill: THEME_CHART_COLORS[index % THEME_CHART_COLORS.length],
    })),
    resolutionTrends: (payload.resolution_trends ?? []).map((row) => ({
      month: row.month,
      avgHours: row.avg_hours,
      avgDays: row.avg_days,
      completedCount: row.completed_count,
    })),
    technicianPerformance: (payload.technician_performance ?? []).map((row) => ({
      technicianId: row.technician_id,
      displayName: row.display_name,
      completedCount: row.completed_count,
      inProgressCount: row.in_progress_count,
      avgDaysToResolve: row.avg_days_to_resolve,
    })),
    satisfaction: {
      avgRating: payload.satisfaction?.avg_rating ?? 0,
      totalRated,
      totalClosed: payload.satisfaction?.total_closed ?? 0,
      responseRate: payload.satisfaction?.response_rate ?? 0,
      distribution: [5, 4, 3, 2, 1].map((star) => {
        const count = payload.satisfaction?.distribution?.find((row) => row.star === star)?.count ?? 0;
        return {
          star,
          count,
          percentage: totalRated > 0 ? Number(((count / totalRated) * 100).toFixed(1)) : 0,
        };
      }),
      monthlyTrends: (payload.satisfaction?.monthly_trends ?? []).map((row) => ({
        month: row.month,
        avgRating: row.avg_rating,
        count: row.count,
      })),
      technicianRankings: (payload.satisfaction?.technician_rankings ?? []).map((row) => ({
        technicianId: row.technician_id,
        displayName: row.display_name,
        avgRating: row.avg_rating,
        ratedCount: row.rated_count,
        completedCount: row.completed_count,
      })),
    },
    filter: { preset: filter.preset, from: filter.from, to: filter.to },
  };
}
