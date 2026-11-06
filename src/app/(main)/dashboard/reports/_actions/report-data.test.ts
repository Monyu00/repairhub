import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/database.types";

import { fetchReportDataWithClient, resolveReportFilter } from "./report-data";
import assert from "node:assert/strict";
import test from "node:test";

const aggregatePayload = {
  kpi: {
    total_tickets: 4,
    completed_or_closed_count: 2,
    pending_count: 1,
    in_progress_count: 1,
    completion_rate: 50,
    overall_avg_days_to_resolve: 2.5,
  },
  monthly_trends: [{ month: "2026-11", total: 4, completed: 2, pending_or_progress: 2 }],
  resolution_trends: [{ month: "2026-11", avg_hours: 24, avg_days: 1, completed_count: 2 }],
  building_distribution: [{ building_id: "building-1", building_name: "行政大樓", building_code: "ADM", count: 4 }],
  campus_buildings: [
    {
      building_id: "building-1",
      building_code: "A",
      building_name: "A 棟",
      status_counts: {
        pending: 1,
        in_progress: 1,
        completed: 1,
        closed: 1,
        cancelled: 0,
        total: 4,
      },
    },
  ],
  category_distribution: [{ category_id: "category-1", category_name: "水電", count: 3 }],
  technician_performance: [
    {
      technician_id: "technician-1",
      display_name: "王技師",
      completed_count: 2,
      in_progress_count: 1,
      avg_days_to_resolve: 2.5,
    },
  ],
  satisfaction: {
    avg_rating: 4.5,
    total_rated: 2,
    total_closed: 3,
    response_rate: 66.7,
    distribution: [
      { star: 5, count: 1 },
      { star: 4, count: 1 },
      { star: 3, count: 0 },
      { star: 2, count: 0 },
      { star: 1, count: 0 },
    ],
    monthly_trends: [{ month: "2026-11", avg_rating: 4.5, count: 2 }],
    technician_rankings: [
      {
        technician_id: "technician-1",
        display_name: "王技師",
        avg_rating: 4.5,
        rated_count: 2,
        completed_count: 2,
      },
    ],
  },
};

function createRpcClient(
  handler: (
    name: string,
    args: { p_from: string | null; p_to: string | null },
  ) => {
    data: unknown;
    error: { message: string } | null;
  },
) {
  const calls: Array<{ name: string; args: { p_from: string | null; p_to: string | null } }> = [];
  const supabase = {
    rpc: async (name: string, args: { p_from: string | null; p_to: string | null }) => {
      calls.push({ name, args });
      return handler(name, args);
    },
  } as unknown as SupabaseClient<Database>;

  return { calls, supabase };
}

test("Report loader sends custom date bounds to the aggregate RPC", async () => {
  const { calls, supabase } = createRpcClient(() => ({ data: aggregatePayload, error: null }));

  const result = await fetchReportDataWithClient(supabase, {
    range: "custom",
    from: "2026-01-02",
    to: "2026-02-03",
  });

  assert.deepEqual(calls, [
    {
      name: "report_aggregates",
      args: {
        p_from: "2026-01-02T00:00:00.000Z",
        p_to: "2026-02-03T23:59:59.999Z",
      },
    },
  ]);
  assert.equal(result.filter.preset, "custom");
  assert.equal(result.filter.from, "2026-01-02");
});

test("Report loader maps aggregate sections without raw Ticket rows", async () => {
  const { supabase } = createRpcClient(() => ({ data: aggregatePayload, error: null }));

  const result = await fetchReportDataWithClient(supabase, { range: "1y" });

  assert.deepEqual(result.kpi, {
    totalTickets: 4,
    completedOrClosedCount: 2,
    pendingCount: 1,
    inProgressCount: 1,
    completionRate: 50,
    overallAvgDaysToResolve: 2.5,
    activePeriodLabel: "過去 1 年",
  });
  assert.deepEqual(result.monthlyTrends, [{ month: "2026-11", total: 4, completed: 2, pendingOrProgress: 2 }]);
  assert.deepEqual(result.buildingDistribution, [
    {
      buildingId: "building-1",
      buildingName: "行政大樓",
      buildingCode: "ADM",
      count: 4,
      percentage: 100,
      fill: "var(--chart-1)",
    },
  ]);
  assert.deepEqual(result.campusBuildings, [
    {
      buildingId: "building-1",
      buildingCode: "A",
      buildingName: "A 棟",
      statusCounts: {
        pending: 1,
        in_progress: 1,
        completed: 1,
        closed: 1,
        cancelled: 0,
        total: 4,
      },
    },
  ]);
  assert.deepEqual(result.technicianPerformance, [
    {
      technicianId: "technician-1",
      displayName: "王技師",
      completedCount: 2,
      inProgressCount: 1,
      avgDaysToResolve: 2.5,
    },
  ]);
  assert.deepEqual(result.satisfaction.distribution, [
    { star: 5, count: 1, percentage: 50 },
    { star: 4, count: 1, percentage: 50 },
    { star: 3, count: 0, percentage: 0 },
    { star: 2, count: 0, percentage: 0 },
    { star: 1, count: 0, percentage: 0 },
  ]);
});

test("Report loader handles empty ranges and invalid custom dates without raw rows", async () => {
  const { calls, supabase } = createRpcClient(() => ({
    data: {
      kpi: {},
      monthly_trends: [],
      resolution_trends: [],
      building_distribution: [],
      campus_buildings: [],
      category_distribution: [],
      technician_performance: [],
      satisfaction: { distribution: [] },
    },
    error: null,
  }));

  const result = await fetchReportDataWithClient(supabase, {
    range: "custom",
    from: "not-a-date",
    to: "2026-02-31",
  });

  assert.deepEqual(calls[0]?.args, { p_from: null, p_to: null });
  assert.deepEqual(result.monthlyTrends, []);
  assert.deepEqual(result.buildingDistribution, []);
  assert.deepEqual(result.campusBuildings, []);
  assert.deepEqual(
    result.satisfaction.distribution.map((row) => row.count),
    [0, 0, 0, 0, 0],
  );
});

test("Report loader returns an empty contract when the aggregate RPC fails", async () => {
  const { supabase } = createRpcClient(() => ({ data: null, error: { message: "failed" } }));

  const result = await fetchReportDataWithClient(supabase, { range: "all" });

  assert.equal(result.kpi.totalTickets, 0);
  assert.equal(result.kpi.activePeriodLabel, "全部歷史紀錄");
  assert.equal(result.filter.preset, "all");
});

test("Report filter resolves preset windows against the supplied clock", () => {
  const filter = resolveReportFilter({ range: "30d" }, new Date("2026-11-04T12:00:00.000Z"));

  assert.equal(filter.startDate?.toISOString(), "2026-10-05T12:00:00.000Z");
  assert.equal(filter.endDate, null);
});
