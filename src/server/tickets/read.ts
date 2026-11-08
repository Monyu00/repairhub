import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/database.types";
import type { TicketStatus } from "@/server/tickets/lifecycle";
import { type QueryTicketsResult, queryTickets } from "@/server/tickets/query";

export type TicketReadAdapter = SupabaseClient<Database>;

export interface PublicTicketListOptions {
  page: number;
  pageSize: number;
  buildingId?: string;
  categoryId?: string;
  search?: string;
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
