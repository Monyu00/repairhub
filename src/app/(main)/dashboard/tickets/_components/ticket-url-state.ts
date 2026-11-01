export type TicketSortField = "created_at" | "updated_at";

export interface TicketSort {
  field: TicketSortField;
  ascending: boolean;
}

export function parseTicketSortParam(raw: string | undefined): TicketSort {
  if (raw === "created_at_asc") {
    return { field: "created_at", ascending: true };
  }
  if (raw === "updated_at_asc") {
    return { field: "updated_at", ascending: true };
  }
  if (raw === "updated_at_desc") {
    return { field: "updated_at", ascending: false };
  }
  return { field: "created_at", ascending: false };
}

export function toggleTicketSortParam(raw: string | undefined): string {
  const sort = parseTicketSortParam(raw);
  if (sort.field === "created_at" && sort.ascending) {
    return "created_at_desc";
  }
  return "created_at_asc";
}
