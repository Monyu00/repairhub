import { Suspense } from "react";

import type { Metadata } from "next";

import { createClient } from "@/lib/supabase/server";
import { getSession } from "@/server/auth/session";
import { queryTickets } from "@/server/tickets/query";

import type { FilterOptions, TicketStatus } from "./_components/ticket-types";
import { TicketsDataTable } from "./_components/tickets-data-table";

export const metadata: Metadata = {
  title: "報修單管理 - RepairHub",
  description: "全校報修單據管理列表，支援狀態、類別、地點與日期等多維度篩選。",
};

interface PageProps {
  searchParams: Promise<{
    status?: string;
    category?: string;
    building?: string;
    from?: string;
    to?: string;
    page?: string;
  }>;
}

const PAGE_SIZE = 10;

export default async function Page({ searchParams }: PageProps) {
  const params = await searchParams;
  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);

  const statusArray = params.status ? (params.status.split(",").filter(Boolean) as TicketStatus[]) : [];
  const categoryId = params.category && params.category !== "all" ? params.category : undefined;
  const buildingId = params.building && params.building !== "all" ? params.building : undefined;
  const fromDate = params.from ?? undefined;
  const toDate = params.to ?? undefined;

  // 1. Get cached session (deduplicated from layout)
  const session = await getSession();
  const supabase = session?.supabase ?? (await createClient());

  // 2. Fetch categories, buildings, and tickets concurrently
  const categoriesPromise = supabase.from("categories").select("id, name").eq("is_active", true).order("sort_order");
  const buildingsPromise = supabase.from("buildings").select("id, name, code").order("code");

  const userRole = session?.role ?? null;
  const canViewReporter = userRole === "admin" || userRole === "technician";

  const ticketsPromise = queryTickets(supabase, {
    status: statusArray.length > 0 ? statusArray : undefined,
    categoryId,
    buildingId,
    fromDate,
    toDate,
    page,
    pageSize: PAGE_SIZE,
    viewerContext: {
      role: userRole,
      userId: session?.userId,
      email: session?.email,
    },
  });

  const [categoriesRes, buildingsRes, { tickets, totalCount }] = await Promise.all([
    categoriesPromise,
    buildingsPromise,
    ticketsPromise,
  ]);

  const filterOptions: FilterOptions = {
    categories: categoriesRes.data ?? [],
    buildings: buildingsRes.data ?? [],
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-bold text-2xl text-foreground tracking-tight">報修單管理</h1>
          <p className="text-muted-foreground text-sm">檢視並管理全校設施設備通報單據</p>
        </div>
      </div>

      {/* Main Data Table */}
      <Suspense fallback={<div className="p-8 text-center text-muted-foreground text-sm">載入資料中...</div>}>
        <TicketsDataTable
          tickets={tickets}
          totalCount={totalCount}
          currentPage={page}
          pageSize={PAGE_SIZE}
          filterOptions={filterOptions}
          canViewReporter={canViewReporter}
          userId={session?.userId ?? null}
          userRole={userRole}
        />
      </Suspense>
    </div>
  );
}
