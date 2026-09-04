import type { Metadata } from "next";

import { createClient } from "@/lib/supabase/server";
import { getSession } from "@/server/auth/session";
import type { TicketStatus } from "@/server/tickets/lifecycle";

import { RepairRecordsContent } from "./_components/repair-records-content";
import type { RepairRecordItem, TechnicianOption } from "./_components/repair-records-types";

export const metadata: Metadata = {
  title: "維修紀錄 - RepairHub",
  description: "查看維修人員承接之維修紀錄，追蹤處理中、已完工與已結案單據。",
};

interface PageProps {
  searchParams: Promise<{
    status?: string;
    technician?: string;
    page?: string;
  }>;
}

const PAGE_SIZE = 10;
const VALID_STATUSES: TicketStatus[] = ["in_progress", "completed", "closed"];

export default async function Page({ searchParams }: PageProps) {
  const params = await searchParams;
  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);

  const session = await getSession();

  if (!session?.userId || !session.role) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-muted-foreground">無法取得使用者資訊，請重新登入。</p>
      </div>
    );
  }

  const userRole = session.role;
  const isAdmin = userRole === "admin";
  const isTechnician = userRole === "technician";

  if (!isAdmin && !isTechnician) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-muted-foreground">您無權限檢視維修紀錄。</p>
      </div>
    );
  }

  const supabase = session.supabase ?? (await createClient());

  // Technicians list for admin filter dropdown
  let technicians: TechnicianOption[] = [];
  if (isAdmin) {
    const { data: techData } = await supabase
      .from("profiles")
      .select("id, display_name")
      .eq("user_role", "technician")
      .order("display_name", { ascending: true });

    technicians = (techData ?? []).map((t) => ({
      id: t.id,
      displayName: t.display_name || `技師 (${t.id.slice(0, 8)})`,
    }));
  }

  // Determine status filter
  const requestedStatus = params.status;
  const statusFilter: TicketStatus[] =
    requestedStatus && VALID_STATUSES.includes(requestedStatus as TicketStatus)
      ? [requestedStatus as TicketStatus]
      : VALID_STATUSES;

  // Build query
  const selectQuery = `
    id,
    status,
    category_id,
    space_id,
    description,
    reporter_name,
    reporter_department,
    reporter_email,
    reporter_phone,
    assigned_to,
    created_at,
    updated_at,
    category:categories(id, name),
    space:spaces(
      id,
      name,
      floor,
      building:buildings(id, name, code)
    ),
    assigned_technician:profiles!tickets_assigned_to_fkey(
      id,
      display_name
    )
  `;

  let query = supabase.from("tickets").select(selectQuery, { count: "exact" }).in("status", statusFilter);

  if (isTechnician) {
    // Technician can only see tickets assigned to them
    query = query.eq("assigned_to", session.userId);
  } else if (isAdmin && params.technician && params.technician !== "all") {
    // Admin filter by technician
    query = query.eq("assigned_to", params.technician);
  }

  const fromIndex = (page - 1) * PAGE_SIZE;
  const toIndex = fromIndex + PAGE_SIZE - 1;

  const {
    data: rawTickets,
    count,
    error,
  } = await query.order("created_at", { ascending: false }).range(fromIndex, toIndex);

  if (error) {
    console.error("Error fetching repair records:", error);
  }

  type RawRecord = Record<string, unknown>;
  const records: RepairRecordItem[] = ((rawTickets ?? []) as unknown[]).map((raw) => {
    const t = (raw ?? {}) as RawRecord;

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

    const techRaw = Array.isArray(t.assigned_technician) ? t.assigned_technician[0] : t.assigned_technician;
    const techData = techRaw as { id: string; display_name: string | null } | null;

    return {
      id: String(t.id ?? ""),
      status: (t.status ?? "in_progress") as TicketStatus,
      category: categoryData,
      space: {
        id: String(spaceData.id ?? ""),
        name: String(spaceData.name ?? "未知空間"),
        floor: Number(spaceData.floor ?? 0),
        building: buildingData,
      },
      description: String(t.description ?? ""),
      reporterName: (t.reporter_name as string | null) ?? null,
      reporterDepartment: (t.reporter_department as string | null) ?? null,
      reporterEmail: (t.reporter_email as string | null) ?? null,
      reporterPhone: (t.reporter_phone as string | null) ?? null,
      assignedTo: (t.assigned_to as string | null) ?? null,
      technicianName: techData?.display_name || (t.assigned_to ? `技師 (${String(t.assigned_to).slice(0, 8)})` : null),
      createdAt: String(t.created_at ?? ""),
      updatedAt: String(t.updated_at ?? ""),
    };
  });

  const totalCount = count ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-bold text-2xl text-foreground tracking-tight">維修紀錄</h1>
          <p className="text-muted-foreground text-sm">
            {isAdmin ? "檢視與追蹤全校各維修人員之接單及完工紀錄" : "檢視您承接的所有維修單據及處理進度"}
          </p>
        </div>
      </div>

      <RepairRecordsContent
        records={records}
        totalCount={totalCount}
        currentPage={page}
        pageSize={PAGE_SIZE}
        isAdmin={isAdmin}
        technicians={technicians}
      />
    </div>
  );
}
