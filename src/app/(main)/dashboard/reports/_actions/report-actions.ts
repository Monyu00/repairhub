import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

import type {
  AvgResolutionTimeStat,
  BuildingDistributionStat,
  CategoryDistributionStat,
  DateRangePreset,
  MonthlyTicketStat,
  ReportData,
  ReportKpiSummary,
  TechnicianPerformanceStat,
} from "../_components/report-types";

// Palette generator using CSS variables matching theme tokens
const THEME_CHART_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  "hsl(var(--primary))",
  "hsl(var(--muted-foreground))",
  "hsl(var(--accent-foreground))",
];

export async function fetchReportData(filterParams?: {
  range?: string;
  from?: string;
  to?: string;
}): Promise<ReportData> {
  const preset: DateRangePreset = (filterParams?.range as DateRangePreset) || "1y";
  const customFrom = filterParams?.from;
  const customTo = filterParams?.to;

  const now = new Date();
  let startDate: Date | null = null;
  let endDate: Date | null = null;
  let periodLabel = "過去 1 年";

  if (preset === "30d") {
    startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    periodLabel = "過去 30 天";
  } else if (preset === "90d") {
    startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    periodLabel = "過去 90 天";
  } else if (preset === "6m") {
    startDate = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
    periodLabel = "過去 6 個月";
  } else if (preset === "1y") {
    startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
    periodLabel = "過去 1 年";
  } else if (preset === "all") {
    startDate = null;
    endDate = null;
    periodLabel = "全部歷史紀錄";
  } else if (preset === "custom") {
    if (customFrom) {
      startDate = new Date(`${customFrom}T00:00:00.000Z`);
    }
    if (customTo) {
      endDate = new Date(`${customTo}T23:59:59.999Z`);
    }
    periodLabel = `${customFrom ?? "起始"} ~ ${customTo ?? "至今"}`;
  }

  const supabase = createAdminClient();

  // Fetch all tickets in the date range with joins
  let query = supabase.from("tickets").select(`
    id,
    status,
    category_id,
    space_id,
    assigned_to,
    created_at,
    updated_at,
    category:categories(id, name),
    space:spaces(
      id,
      name,
      building:buildings(id, name, code)
    ),
    technician:profiles!assigned_to(
      id,
      display_name,
      user_role
    )
  `);

  if (startDate) {
    query = query.gte("created_at", startDate.toISOString());
  }
  if (endDate) {
    query = query.lte("created_at", endDate.toISOString());
  }

  const { data: rawTickets, error } = await query.order("created_at", { ascending: true });

  if (error) {
    console.error("Error fetching report tickets:", error);
    return {
      kpi: {
        totalTickets: 0,
        completedOrClosedCount: 0,
        pendingCount: 0,
        inProgressCount: 0,
        completionRate: 0,
        overallAvgDaysToResolve: 0,
        activePeriodLabel: periodLabel,
      },
      monthlyTrends: [],
      buildingDistribution: [],
      categoryDistribution: [],
      resolutionTrends: [],
      technicianPerformance: [],
      filter: { preset, from: customFrom, to: customTo },
    };
  }

  type RawTicket = {
    id: string;
    status: "pending" | "in_progress" | "completed" | "closed" | "cancelled";
    category_id: string;
    space_id: string;
    assigned_to: string | null;
    created_at: string;
    updated_at: string;
    category: { id: string; name: string } | { id: string; name: string }[] | null;
    space:
      | {
          id: string;
          name: string;
          building: { id: string; name: string; code: string } | { id: string; name: string; code: string }[] | null;
        }
      | {
          id: string;
          name: string;
          building: { id: string; name: string; code: string } | { id: string; name: string; code: string }[] | null;
        }[]
      | null;
    technician:
      | { id: string; display_name: string | null; user_role: string | null }
      | { id: string; display_name: string | null; user_role: string | null }[]
      | null;
  };

  const tickets = (rawTickets ?? []) as unknown as RawTicket[];

  // 1. KPI Calculation
  const totalTickets = tickets.length;
  let completedOrClosedCount = 0;
  let pendingCount = 0;
  let inProgressCount = 0;
  let totalResolutionTimeHours = 0;
  let resolvedCountForAvg = 0;

  tickets.forEach((t) => {
    if (t.status === "completed" || t.status === "closed") {
      completedOrClosedCount++;
      const created = new Date(t.created_at).getTime();
      const updated = new Date(t.updated_at).getTime();
      if (updated > created) {
        const diffHours = (updated - created) / (1000 * 60 * 60);
        totalResolutionTimeHours += diffHours;
        resolvedCountForAvg++;
      }
    } else if (t.status === "pending") {
      pendingCount++;
    } else if (t.status === "in_progress") {
      inProgressCount++;
    }
  });

  const completionRate = totalTickets > 0 ? Number(((completedOrClosedCount / totalTickets) * 100).toFixed(1)) : 0;
  const overallAvgDaysToResolve =
    resolvedCountForAvg > 0 ? Number((totalResolutionTimeHours / resolvedCountForAvg / 24).toFixed(1)) : 0;

  const kpi: ReportKpiSummary = {
    totalTickets,
    completedOrClosedCount,
    pendingCount,
    inProgressCount,
    completionRate,
    overallAvgDaysToResolve,
    activePeriodLabel: periodLabel,
  };

  // 2. Monthly Trends & Resolution Times
  const monthlyMap = new Map<
    string,
    { total: number; completed: number; pendingOrProgress: number; totalHours: number; resolvedCount: number }
  >();

  tickets.forEach((t) => {
    const date = new Date(t.created_at);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

    const current = monthlyMap.get(monthKey) || {
      total: 0,
      completed: 0,
      pendingOrProgress: 0,
      totalHours: 0,
      resolvedCount: 0,
    };

    current.total++;
    if (t.status === "completed" || t.status === "closed") {
      current.completed++;
      const created = new Date(t.created_at).getTime();
      const updated = new Date(t.updated_at).getTime();
      if (updated > created) {
        current.totalHours += (updated - created) / (1000 * 60 * 60);
        current.resolvedCount++;
      }
    } else if (t.status === "pending" || t.status === "in_progress") {
      current.pendingOrProgress++;
    }

    monthlyMap.set(monthKey, current);
  });

  // Sort monthly trends chronologically
  const sortedMonths = Array.from(monthlyMap.keys()).sort();
  const monthlyTrends: MonthlyTicketStat[] = sortedMonths.map((m) => {
    const data = monthlyMap.get(m) ?? { total: 0, completed: 0, pendingOrProgress: 0, totalHours: 0, resolvedCount: 0 };
    return {
      month: m,
      total: data.total,
      completed: data.completed,
      pendingOrProgress: data.pendingOrProgress,
    };
  });

  const resolutionTrends: AvgResolutionTimeStat[] = sortedMonths.map((m) => {
    const data = monthlyMap.get(m) ?? { total: 0, completed: 0, pendingOrProgress: 0, totalHours: 0, resolvedCount: 0 };
    const avgHours = data.resolvedCount > 0 ? Number((data.totalHours / data.resolvedCount).toFixed(1)) : 0;
    const avgDays = Number((avgHours / 24).toFixed(1));
    return {
      month: m,
      avgHours,
      avgDays,
      completedCount: data.resolvedCount,
    };
  });

  // 3. Building Distribution
  const buildingMap = new Map<string, { id: string; name: string; code: string; count: number }>();
  tickets.forEach((t) => {
    const spaceObj = Array.isArray(t.space) ? t.space[0] : t.space;
    let buildingObj = null;
    if (spaceObj?.building) {
      buildingObj = Array.isArray(spaceObj.building) ? spaceObj.building[0] : spaceObj.building;
    }
    const bId = buildingObj?.id || "unknown";
    const bName = buildingObj?.name || "未指定建築";
    const bCode = buildingObj?.code || "N/A";

    const current = buildingMap.get(bId) || { id: bId, name: bName, code: bCode, count: 0 };
    current.count++;
    buildingMap.set(bId, current);
  });

  const buildingDistribution: BuildingDistributionStat[] = Array.from(buildingMap.values())
    .sort((a, b) => b.count - a.count)
    .map((b, idx) => ({
      buildingId: b.id,
      buildingName: b.name,
      buildingCode: b.code,
      count: b.count,
      percentage: totalTickets > 0 ? Number(((b.count / totalTickets) * 100).toFixed(1)) : 0,
      fill: THEME_CHART_COLORS[idx % THEME_CHART_COLORS.length],
    }));

  // 4. Category Distribution
  const categoryMap = new Map<string, { id: string; name: string; count: number }>();
  tickets.forEach((t) => {
    const catObj = Array.isArray(t.category) ? t.category[0] : t.category;
    const catId = catObj?.id || "unknown";
    const catName = catObj?.name || "未分類";

    const current = categoryMap.get(catId) || { id: catId, name: catName, count: 0 };
    current.count++;
    categoryMap.set(catId, current);
  });

  const categoryDistribution: CategoryDistributionStat[] = Array.from(categoryMap.values())
    .sort((a, b) => b.count - a.count)
    .map((c, idx) => ({
      categoryId: c.id,
      categoryName: c.name,
      count: c.count,
      percentage: totalTickets > 0 ? Number(((c.count / totalTickets) * 100).toFixed(1)) : 0,
      fill: THEME_CHART_COLORS[idx % THEME_CHART_COLORS.length],
    }));

  // 5. Technician Performance
  const techMap = new Map<
    string,
    { id: string; name: string; completed: number; inProgress: number; totalHours: number; resolvedCount: number }
  >();

  tickets.forEach((t) => {
    if (!t.assigned_to) return;
    const techObj = Array.isArray(t.technician) ? t.technician[0] : t.technician;
    const techId = t.assigned_to;
    const techName = techObj?.display_name || "未知技師";

    const current = techMap.get(techId) || {
      id: techId,
      name: techName,
      completed: 0,
      inProgress: 0,
      totalHours: 0,
      resolvedCount: 0,
    };

    if (t.status === "completed" || t.status === "closed") {
      current.completed++;
      const created = new Date(t.created_at).getTime();
      const updated = new Date(t.updated_at).getTime();
      if (updated > created) {
        current.totalHours += (updated - created) / (1000 * 60 * 60);
        current.resolvedCount++;
      }
    } else if (t.status === "in_progress") {
      current.inProgress++;
    }

    techMap.set(techId, current);
  });

  const technicianPerformance: TechnicianPerformanceStat[] = Array.from(techMap.values())
    .sort((a, b) => b.completed - a.completed)
    .map((tech) => ({
      technicianId: tech.id,
      displayName: tech.name,
      completedCount: tech.completed,
      inProgressCount: tech.inProgress,
      avgDaysToResolve: tech.resolvedCount > 0 ? Number((tech.totalHours / tech.resolvedCount / 24).toFixed(1)) : 0,
    }));

  return {
    kpi,
    monthlyTrends,
    buildingDistribution,
    categoryDistribution,
    resolutionTrends,
    technicianPerformance,
    filter: {
      preset,
      from: customFrom,
      to: customTo,
    },
  };
}
