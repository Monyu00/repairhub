import { Suspense } from "react";

import type { Metadata } from "next";

import { createClient } from "@/lib/supabase/server";
import { getSession } from "@/server/auth/session";

import type { FilterOptions, TicketRow, TicketStatus } from "./_components/ticket-types";
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
  const categoryId = params.category && params.category !== "all" ? params.category : null;
  const buildingId = params.building && params.building !== "all" ? params.building : null;
  const fromDate = params.from ?? null;
  const toDate = params.to ?? null;

  // 1. Get cached session (deduplicated from layout)
  const session = await getSession();
  const supabase = session?.supabase ?? (await createClient());

  // 2. Fetch categories, buildings, and tickets in parallel
  const categoriesPromise = supabase.from("categories").select("id, name").eq("is_active", true).order("sort_order");
  const buildingsPromise = supabase.from("buildings").select("id, name, code").order("code");

  // 3. Build tickets query
  const spaceJoin = buildingId ? "spaces!inner" : "spaces";
  const selectString = `
    id,
    status,
    category_id,
    space_id,
    description,
    reporter_email,
    reporter_phone,
    created_at,
    updated_at,
    category:categories(id, name),
    space:${spaceJoin}(
      id,
      name,
      floor,
      building_id,
      building:buildings(id, name, code)
    )
  `;

  let query = supabase.from("tickets").select(selectString, { count: "exact" });

  if (statusArray.length > 0) {
    query = query.in("status", statusArray);
  }

  if (categoryId) {
    query = query.eq("category_id", categoryId);
  }

  if (buildingId) {
    query = query.eq("space.building_id", buildingId);
  }

  if (fromDate) {
    query = query.gte("created_at", `${fromDate}T00:00:00.000Z`);
  }

  if (toDate) {
    query = query.lte("created_at", `${toDate}T23:59:59.999Z`);
  }

  const fromIndex = (page - 1) * PAGE_SIZE;
  const toIndex = fromIndex + PAGE_SIZE - 1;
  const ticketsPromise = query.order("created_at", { ascending: false }).range(fromIndex, toIndex);

  // 4. Await all data queries concurrently
  const [categoriesRes, buildingsRes, ticketsRes] = await Promise.all([
    categoriesPromise,
    buildingsPromise,
    ticketsPromise,
  ]);

  const userRole = session?.role ?? null;
  const canViewReporter = userRole === "admin" || userRole === "technician";

  const filterOptions: FilterOptions = {
    categories: categoriesRes.data ?? [],
    buildings: buildingsRes.data ?? [],
  };

  const rawTickets = ticketsRes.data;
  const count = ticketsRes.count;
  const error = ticketsRes.error;

  if (error) {
    console.error("Error fetching tickets:", error);
  }

  // 4. Sanitize sensitive fields if user is not admin/technician
  type RawTicket = Record<string, unknown>;
  const tickets: TicketRow[] = ((rawTickets ?? []) as unknown[]).map((raw) => {
    const t = (raw ?? {}) as RawTicket;
    const spaceRaw = Array.isArray(t.space) ? t.space[0] : t.space;
    const spaceData = (spaceRaw ?? {}) as Record<string, unknown>;

    let buildingData = { id: "", name: "未知大樓", code: "" };
    if (spaceData.building) {
      const bRaw = Array.isArray(spaceData.building) ? spaceData.building[0] : spaceData.building;
      if (bRaw && typeof bRaw === "object") {
        buildingData = bRaw as { id: string; name: string; code: string };
      }
    }

    const catRaw = Array.isArray(t.category) ? t.category[0] : t.category;
    const categoryData = (catRaw ?? { id: "", name: "未分類" }) as { id: string; name: string };

    return {
      id: String(t.id ?? ""),
      status: (t.status ?? "pending") as TicketStatus,
      category: categoryData,
      space: {
        id: String(spaceData.id ?? ""),
        name: String(spaceData.name ?? "未知空間"),
        floor: Number(spaceData.floor ?? 0),
        building: buildingData,
      },
      description: String(t.description ?? ""),
      reporter_email: canViewReporter ? (t.reporter_email as string | null) : null,
      reporter_phone: canViewReporter ? (t.reporter_phone as string | null) : null,
      created_at: String(t.created_at ?? ""),
      updated_at: String(t.updated_at ?? ""),
    };
  });

  const totalCount = count ?? 0;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">報修單管理</h1>
          <p className="text-sm text-muted-foreground">檢視並管理全校設施設備通報單據</p>
        </div>
      </div>

      {/* Main Data Table */}
      <Suspense fallback={<div className="text-sm text-muted-foreground p-8 text-center">載入資料中...</div>}>
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
