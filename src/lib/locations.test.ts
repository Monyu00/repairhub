import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/database.types";

import { getLocationBySpaceId, getLocationCatalog } from "./locations";
import assert from "node:assert/strict";
import test from "node:test";

function createSupabase(data: unknown, error: unknown = null) {
  return {
    from: () => ({
      select: () => ({
        order: () => ({
          order: async () => ({ data, error }),
        }),
      }),
    }),
  } as unknown as SupabaseClient<Database>;
}

test("returns an empty catalog when there are no buildings", async () => {
  const supabase = createSupabase(null);

  assert.deepEqual(await getLocationCatalog(supabase), []);
});

test("returns an empty catalog when the query fails", async () => {
  const supabase = createSupabase(null, new Error("query failed"));

  assert.deepEqual(await getLocationCatalog(supabase), []);
});

test("returns an ordered Location Catalog without database metadata", async () => {
  const supabase = createSupabase([
    {
      id: "b-2",
      name: "Z Building",
      code: "Z",
      sort_order: 1,
      updated_at: "2026-01-01",
      spaces: [
        { id: "s-3", name: "C", floor: 1, sort_order: 2, created_at: "2026-01-01" },
        { id: "s-1", name: "A", floor: 2, sort_order: 1, updated_at: "2026-01-01" },
      ],
    },
    {
      id: "b-1",
      name: "A Building",
      code: "A",
      sort_order: 2,
      created_at: "2026-01-01",
      spaces: null,
    },
  ]);

  assert.deepEqual(await getLocationCatalog(supabase), [
    {
      id: "b-2",
      name: "Z Building",
      code: "Z",
      spaces: [
        { id: "s-1", name: "A", floor: 2 },
        { id: "s-3", name: "C", floor: 1 },
      ],
    },
    { id: "b-1", name: "A Building", code: "A", spaces: [] },
  ]);
});

test("resolves equipment location display through the catalog and falls back for a missing relation", () => {
  const buildings = [
    {
      id: "b-1",
      name: "A Building",
      code: "A",
      spaces: [{ id: "s-1", name: "Room 101", floor: 1 }],
    },
  ];

  assert.deepEqual(getLocationBySpaceId(buildings, "s-1"), {
    buildingId: "b-1",
    buildingName: "A Building",
    spaceId: "s-1",
    spaceName: "Room 101",
  });
  assert.deepEqual(getLocationBySpaceId(buildings, "missing"), {
    buildingId: "",
    buildingName: "未指定建築",
    spaceId: "missing",
    spaceName: "未指定空間",
  });
});
