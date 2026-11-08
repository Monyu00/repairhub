import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/database.types";
import type { TicketStatus } from "@/server/tickets/lifecycle";
import {
  type QueryTicketsOptions,
  type QueryTicketsResult,
  queryTickets,
  type ViewerContext,
} from "@/server/tickets/query";

export type TicketReadAdapter = SupabaseClient<Database>;

export interface PublicTicketListOptions {
  page: number;
  pageSize: number;
  status?: TicketStatus;
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
  viewerContext: QueryTicketsOptions["viewerContext"];
}

export interface TechnicianQueueResult extends QueryTicketsResult {
  subscribedCategoryIds: string[];
}

export interface RepairRecordsOptions {
  search?: string;
  status?: string;
  technicianId?: string;
  page?: string;
  viewer: ViewerContext;
}

export interface RepairRecordsResult extends QueryTicketsResult {
  page: number;
  pageSize: number;
}

const PUBLIC_TICKET_STATUSES: TicketStatus[] = ["pending", "in_progress", "completed"];
const REPAIR_RECORDS_STATUSES: TicketStatus[] = ["in_progress", "completed", "closed"];
const REPAIR_RECORDS_PAGE_SIZE = 10;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function getPublicTickets(
  adapter: TicketReadAdapter,
  options: PublicTicketListOptions,
): Promise<QueryTicketsResult> {
  return queryTickets(adapter, {
    status: options.status ?? PUBLIC_TICKET_STATUSES,
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
  const { userId } = options.viewerContext;
  if (!userId || !UUID_PATTERN.test(userId)) {
    return { tickets: [], totalCount: 0, subscribedCategoryIds: [] };
  }

  const { data, error } = await adapter.from("technician_categories").select("category_id").eq("technician_id", userId);

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

export async function getRepairRecords(
  adapter: TicketReadAdapter,
  options: RepairRecordsOptions,
): Promise<RepairRecordsResult> {
  const { viewer } = options;
  const page = Math.max(1, Number.parseInt(options.page ?? "1", 10) || 1);
  const isPrivileged = viewer.role === "admin" || viewer.role === "technician";
  if (!isPrivileged || !viewer.userId) {
    return { tickets: [], totalCount: 0, page, pageSize: REPAIR_RECORDS_PAGE_SIZE };
  }

  const requestedStatus = options.status;
  if (requestedStatus && !REPAIR_RECORDS_STATUSES.includes(requestedStatus as TicketStatus)) {
    return { tickets: [], totalCount: 0, page, pageSize: REPAIR_RECORDS_PAGE_SIZE };
  }

  const status: TicketStatus[] = requestedStatus ? [requestedStatus as TicketStatus] : REPAIR_RECORDS_STATUSES;

  const assignedTo =
    viewer.role === "technician"
      ? viewer.userId
      : options.technicianId && options.technicianId !== "all"
        ? options.technicianId
        : undefined;

  const result = await queryTickets(adapter, {
    search: options.search?.trim() || undefined,
    status,
    assignedTo,
    page,
    pageSize: REPAIR_RECORDS_PAGE_SIZE,
    sort: { field: "created_at", ascending: false },
    viewerContext: viewer,
  });

  return { ...result, page, pageSize: REPAIR_RECORDS_PAGE_SIZE };
}
