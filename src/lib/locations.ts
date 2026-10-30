import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/database.types";

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

export type LocationCatalogLocation = {
  buildingId: string;
  buildingName: string;
  spaceId: string;
  spaceName: string;
};

export async function getLocationCatalog(supabase: SupabaseClient<Database>): Promise<LocationCatalogBuilding[]> {
  const { data, error } = await supabase
    .from("buildings")
    .select("id, name, code, spaces(id, name, floor, sort_order)")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) return [];

  return (data ?? []).map((building) => ({
    id: building.id,
    name: building.name,
    code: building.code,
    spaces: [...(building.spaces ?? [])]
      .sort((a, b) => {
        if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
        if (a.floor !== b.floor) return a.floor - b.floor;
        return a.name.localeCompare(b.name, "zh-Hant");
      })
      .map((space) => ({
        floor: space.floor,
        id: space.id,
        name: space.name,
      })),
  }));
}

export function getLocationBySpaceId(buildings: LocationCatalogBuilding[], spaceId: string): LocationCatalogLocation {
  for (const building of buildings) {
    const space = building.spaces.find((item) => item.id === spaceId);
    if (space) {
      return {
        buildingId: building.id,
        buildingName: building.name,
        spaceId: space.id,
        spaceName: space.name,
      };
    }
  }

  return { buildingId: "", buildingName: "未指定建築", spaceId, spaceName: "未指定空間" };
}
