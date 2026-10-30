import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/database.types";

interface SortableSpace {
  floor: number;
  name: string;
  sort_order: number;
}

export type LocationCatalogSpace = {
  floor: number;
  id: string;
  name: string;
};

export type LocationCatalogBuilding = {
  code: string;
  id: string;
  name: string;
  spaces: LocationCatalogSpace[];
};

export async function getLocationCatalog(supabase: SupabaseClient<Database>): Promise<LocationCatalogBuilding[]> {
  const { data, error } = await supabase
    .from("buildings")
    .select("id, name, code, spaces(id, name, floor, sort_order)")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) throw new Error("Failed to load Location Catalog.", { cause: error });

  return (data ?? []).map((building) => ({
    id: building.id,
    name: building.name,
    code: building.code,
    spaces: sortSpacesByOrder(building.spaces ?? []).map((space) => ({
      floor: space.floor,
      id: space.id,
      name: space.name,
    })),
  }));
}

export function sortSpacesByOrder<T extends SortableSpace>(spaces: T[]): T[] {
  return [...spaces].sort((a, b) => {
    if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
    if (a.floor !== b.floor) return a.floor - b.floor;
    return a.name.localeCompare(b.name, "zh-Hant");
  });
}
