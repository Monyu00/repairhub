import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/database.types";
import type { TicketStatus } from "@/server/tickets/lifecycle";

export type UserRole = Database["public"]["Enums"]["user_role"];

export interface TicketCategory {
  id: string;
  name: string;
}

export interface TicketBuilding {
  id: string;
  name: string;
  code: string;
}

export interface TicketSpace {
  id: string;
  name: string;
  floor: number;
  buildingId: string;
  building: TicketBuilding;
}

export interface TicketTechnician {
  id: string;
  displayName: string;
}

export interface TicketRecord {
  id: string;
  status: TicketStatus;
  categoryId: string;
  category: TicketCategory;
  spaceId: string;
  space: TicketSpace;
  description: string;
  reporterName: string | null;
  reporterDepartment: string | null;
  reporterEmail: string | null;
  reporterPhone: string | null;
  assignedTo: string | null;
  assignedTechnician: TicketTechnician | null;
  technicianName: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ViewerContext {
  role: UserRole | null;
  userId?: string | null;
  email?: string | null;
}

export interface QueryTicketsOptions {
  id?: string;
  status?: TicketStatus | TicketStatus[];
  categoryId?: string | string[];
  spaceId?: string;
  buildingId?: string;
  assignedTo?: string;
  reporterEmail?: string;
  fromDate?: string;
  toDate?: string;
  page?: number;
  pageSize?: number;
  sort?: {
    field?: "created_at" | "updated_at";
    ascending?: boolean;
  };
  viewerContext: ViewerContext;
}

export interface QueryTicketsResult {
  tickets: TicketRecord[];
  totalCount: number;
}

type RawRecord = Record<string, unknown>;

/**
 * Normalizes raw PostgREST ticket rows and enforces privacy redaction.
 */
function normalizeTicketRow(raw: unknown, viewer: ViewerContext): TicketRecord {
  const t = (raw ?? {}) as RawRecord;

  // 1. Unnest space and building relations
  const spaceRaw = Array.isArray(t.space) ? t.space[0] : t.space;
  const spaceData = (spaceRaw ?? {}) as RawRecord;

  let buildingData: TicketBuilding = { id: "", name: "未知大樓", code: "" };
  if (spaceData.building) {
    const bRaw = Array.isArray(spaceData.building) ? spaceData.building[0] : spaceData.building;
    if (bRaw && typeof bRaw === "object") {
      const bObj = bRaw as RawRecord;
      buildingData = {
        id: String(bObj.id ?? ""),
        name: String(bObj.name ?? "未知大樓"),
        code: String(bObj.code ?? ""),
      };
    }
  }

  const space: TicketSpace = {
    id: String(spaceData.id ?? t.space_id ?? ""),
    name: String(spaceData.name ?? "未知空間"),
    floor: Number(spaceData.floor ?? 0),
    buildingId: String(spaceData.building_id ?? buildingData.id ?? ""),
    building: buildingData,
  };

  // 2. Unnest category relation
  const catRaw = Array.isArray(t.category) ? t.category[0] : t.category;
  const categoryData = (catRaw ?? {}) as RawRecord;
  const category: TicketCategory = {
    id: String(categoryData.id ?? t.category_id ?? ""),
    name: String(categoryData.name ?? "未分類"),
  };

  // 3. Unnest assigned technician relation
  let assignedTechnician: TicketTechnician | null = null;
  const techRaw = Array.isArray(t.assigned_technician) ? t.assigned_technician[0] : t.assigned_technician;
  const assignedToId = (t.assigned_to as string | null) ?? null;

  if (techRaw && typeof techRaw === "object") {
    const techObj = techRaw as RawRecord;
    const techId = String(techObj.id ?? assignedToId ?? "");
    const techName = (techObj.display_name as string | null) ?? (techId ? `技師 (${techId.slice(0, 8)})` : "技師");
    assignedTechnician = {
      id: techId,
      displayName: techName,
    };
  } else if (assignedToId) {
    assignedTechnician = {
      id: assignedToId,
      displayName: `技師 (${assignedToId.slice(0, 8)})`,
    };
  }

  // 4. Privacy redaction
  const isPrivileged = viewer.role === "admin" || viewer.role === "technician";
  const isSelfReporter =
    Boolean(viewer.email && t.reporter_email) &&
    String(viewer.email).trim().toLowerCase() === String(t.reporter_email).trim().toLowerCase();
  const canViewReporter = isPrivileged || isSelfReporter;

  const rawReporterName = (t.reporter_name as string | null) ?? null;
  const rawReporterDepartment = (t.reporter_department as string | null) ?? null;
  const rawReporterEmail = (t.reporter_email as string | null) ?? null;
  const rawReporterPhone = (t.reporter_phone as string | null) ?? null;

  return {
    id: String(t.id ?? ""),
    status: (t.status ?? "pending") as TicketStatus,
    categoryId: String(t.category_id ?? category.id),
    category,
    spaceId: String(t.space_id ?? space.id),
    space,
    description: String(t.description ?? ""),
    reporterName: canViewReporter ? rawReporterName : null,
    reporterDepartment: canViewReporter ? rawReporterDepartment : null,
    reporterEmail: canViewReporter ? rawReporterEmail : null,
    reporterPhone: canViewReporter ? rawReporterPhone : null,
    assignedTo: assignedToId,
    assignedTechnician,
    technicianName: assignedTechnician?.displayName ?? null,
    createdAt: String(t.created_at ?? ""),
    updatedAt: String(t.updated_at ?? ""),
  };
}

/**
 * Deep module: Query tickets with standardized PostgREST joins, filtering, pagination, and privacy redaction.
 */
export async function queryTickets(
  supabase: SupabaseClient<Database>,
  options: QueryTicketsOptions,
): Promise<QueryTicketsResult> {
  const {
    id,
    status,
    categoryId,
    spaceId,
    buildingId,
    assignedTo,
    reporterEmail,
    fromDate,
    toDate,
    page,
    pageSize,
    sort,
    viewerContext,
  } = options;

  const spaceJoin = buildingId ? "spaces!inner" : "spaces";
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
    space:${spaceJoin}(
      id,
      name,
      floor,
      building_id,
      building:buildings(id, name, code)
    ),
    assigned_technician:profiles!tickets_assigned_to_fkey(
      id,
      display_name
    )
  `;

  let query = supabase.from("tickets").select(selectQuery, { count: "exact" });

  if (id) {
    query = query.eq("id", id);
  }

  if (status) {
    if (Array.isArray(status)) {
      if (status.length > 0) {
        query = query.in("status", status);
      }
    } else {
      query = query.eq("status", status);
    }
  }

  if (categoryId) {
    if (Array.isArray(categoryId)) {
      if (categoryId.length > 0) {
        query = query.in("category_id", categoryId);
      }
    } else if (categoryId !== "all") {
      query = query.eq("category_id", categoryId);
    }
  }

  if (spaceId) {
    query = query.eq("space_id", spaceId);
  }

  if (buildingId && buildingId !== "all") {
    query = query.eq("space.building_id", buildingId);
  }

  if (assignedTo && assignedTo !== "all") {
    query = query.eq("assigned_to", assignedTo);
  }

  if (reporterEmail) {
    query = query.ilike("reporter_email", reporterEmail);
  }

  if (fromDate) {
    query = query.gte("created_at", `${fromDate}T00:00:00.000Z`);
  }

  if (toDate) {
    query = query.lte("created_at", `${toDate}T23:59:59.999Z`);
  }

  const sortField = sort?.field ?? "created_at";
  const ascending = sort?.ascending ?? false;
  query = query.order(sortField, { ascending });

  if (page && pageSize) {
    const fromIndex = (page - 1) * pageSize;
    const toIndex = fromIndex + pageSize - 1;
    query = query.range(fromIndex, toIndex);
  }

  const { data, count, error } = await query;

  if (error) {
    console.error("queryTickets error:", error);
    return { tickets: [], totalCount: 0 };
  }

  const tickets = (data ?? []).map((row) => normalizeTicketRow(row, viewerContext));
  const totalCount = count ?? tickets.length;

  return { tickets, totalCount };
}

/**
 * Deep module: Fetch a single ticket by ID with normalized relations and privacy redaction.
 */
export async function getTicketById(
  supabase: SupabaseClient<Database>,
  ticketId: string,
  viewerContext: ViewerContext,
): Promise<TicketRecord | null> {
  const result = await queryTickets(supabase, {
    id: ticketId,
    page: 1,
    pageSize: 1,
    viewerContext,
  });

  return result.tickets[0] ?? null;
}
