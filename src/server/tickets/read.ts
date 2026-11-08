import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/database.types";
import type { TicketStatus } from "@/server/tickets/lifecycle";
import { type QueryTicketsOptions, type QueryTicketsResult, queryTickets } from "@/server/tickets/query";

export type TicketReadAdapter = SupabaseClient<Database>;

export interface PublicTicketListOptions {
  page: number;
  pageSize: number;
  buildingId?: string;
  categoryId?: string;
  search?: string;
}

export interface MyTicketsOptions {
  reporterEmail: string;
  page: number;
  pageSize: number;
  viewerContext: QueryTicketsOptions["viewerContext"];
}

export interface TechnicianQueueOptions {
  technicianId: string;
  viewerContext: QueryTicketsOptions["viewerContext"];
}

export interface TechnicianQueueResult extends QueryTicketsResult {
  subscribedCategoryIds: string[];
}

const PUBLIC_TICKET_STATUSES: TicketStatus[] = ["pending", "in_progress", "completed"];

export async function getPublicTickets(
  adapter: TicketReadAdapter,
  options: PublicTicketListOptions,
): Promise<QueryTicketsResult> {
  return queryTickets(adapter, {
    status: PUBLIC_TICKET_STATUSES,
    buildingId: options.buildingId,
    categoryId: options.categoryId,
    search: options.search,
    page: options.page,
    pageSize: options.pageSize,
    sort: { field: "created_at", ascending: false },
    viewerContext: { role: null },
  });
}

export async function getMyTickets(adapter: TicketReadAdapter, options: MyTicketsOptions): Promise<QueryTicketsResult> {
  return queryTickets(adapter, {
    reporterEmail: options.reporterEmail,
    page: options.page,
    pageSize: options.pageSize,
    sort: { field: "created_at", ascending: false },
    viewerContext: options.viewerContext,
  });
}

export async function getTechnicianQueueTickets(
  adapter: TicketReadAdapter,
  options: TechnicianQueueOptions,
): Promise<TechnicianQueueResult> {
  const { data, error } = await adapter
    .from("technician_categories")
    .select("category_id")
    .eq("technician_id", options.technicianId);

  if (error) {
    console.error("getTechnicianQueueTickets category error:", error);
    return { tickets: [], totalCount: 0, subscribedCategoryIds: [] };
  }

  const subscribedCategoryIds = (data ?? []).map((row) => row.category_id);
  if (subscribedCategoryIds.length === 0) {
    return { tickets: [], totalCount: 0, subscribedCategoryIds };
  }

  const result = await queryTickets(adapter, {
    status: "pending",
    categoryId: subscribedCategoryIds,
    viewerContext: options.viewerContext,
  });

  return { ...result, subscribedCategoryIds };
}
