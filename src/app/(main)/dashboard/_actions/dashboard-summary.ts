import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/database.types";
import type { TicketStatus } from "@/server/tickets/lifecycle";
import type { TicketRecord, ViewerContext } from "@/server/tickets/query";
import { queryTickets } from "@/server/tickets/query";

export interface DashboardSummary {
  pendingCount: number;
  todayCount: number;
  inProgressCount: number;
  avgResolutionDays: number;
}

interface TicketCountFilter {
  status?: TicketStatus[];
  assignedTo?: string;
  categoryIds?: string[];
  fromDate?: string;
}

async function countTickets(
  supabase: SupabaseClient<Database>,
  { status, assignedTo, categoryIds, fromDate }: TicketCountFilter,
): Promise<number> {
  if (categoryIds && categoryIds.length === 0) {
    return 0;
  }

  let query = supabase.from("tickets").select("id", { count: "exact" });

  if (status?.length) {
    query = query.in("status", status);
  }
  if (assignedTo) {
    query = query.eq("assigned_to", assignedTo);
  }
  if (categoryIds?.length) {
    query = query.in("category_id", categoryIds);
  }
  if (fromDate) {
    query = query.gte("created_at", fromDate);
  }

  const { count, error } = await query;

  if (error) {
    console.error("Dashboard ticket count failed:", error);
    return 0;
  }

  return count ?? 0;
}

async function fetchDashboardSummary(
  supabase: SupabaseClient<Database>,
  viewerContext: ViewerContext,
): Promise<DashboardSummary> {
  const isAdmin = viewerContext.role === "admin";
  const taipeiToday = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Taipei" }).format(new Date());
  const startOfToday = `${taipeiToday}T00:00:00+08:00`;
  const startOfWindow = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();

  let categoryIds: string[] | undefined;
  if (!isAdmin && viewerContext.userId) {
    const { data } = await supabase
      .from("technician_categories")
      .select("category_id")
      .eq("technician_id", viewerContext.userId);

    categoryIds = (data ?? []).map((row) => row.category_id);
  }

  const assignedTo = isAdmin || !viewerContext.userId ? undefined : viewerContext.userId;
  const countFilter = { assignedTo, categoryIds };

  let resolvedQuery = supabase
    .from("tickets")
    .select("created_at, updated_at")
    .in("status", ["completed", "closed"])
    .gte("updated_at", startOfWindow);

  if (assignedTo) {
    resolvedQuery = resolvedQuery.eq("assigned_to", assignedTo);
  }

  const [pendingCount, todayCount, inProgressCount, resolvedRes] = await Promise.all([
    countTickets(supabase, { ...countFilter, status: ["pending"] }),
    countTickets(supabase, { ...countFilter, fromDate: startOfToday }),
    countTickets(supabase, { ...countFilter, status: ["in_progress"] }),
    resolvedQuery,
  ]);

  let totalHours = 0;
  let resolvedCount = 0;
  for (const row of resolvedRes.data ?? []) {
    const createdAt = new Date(row.created_at).getTime();
    const updatedAt = new Date(row.updated_at).getTime();
    if (updatedAt > createdAt) {
      totalHours += (updatedAt - createdAt) / (1000 * 60 * 60);
      resolvedCount++;
    }
  }

  return {
    pendingCount,
    todayCount,
    inProgressCount,
    avgResolutionDays: resolvedCount > 0 ? Number((totalHours / resolvedCount / 24).toFixed(1)) : 0,
  };
}

async function fetchDashboardOpenTickets(
  supabase: SupabaseClient<Database>,
  viewerContext: ViewerContext,
): Promise<TicketRecord[]> {
  const result = await queryTickets(supabase, {
    status: ["pending", "in_progress"],
    assignedTo: viewerContext.role === "technician" && viewerContext.userId ? viewerContext.userId : undefined,
    page: 1,
    pageSize: 5,
    sort: { field: "created_at", ascending: false },
    viewerContext,
  });

  return result.tickets;
}

export { fetchDashboardOpenTickets, fetchDashboardSummary };
