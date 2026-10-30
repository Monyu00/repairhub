import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/database.types";

import { getLocationCatalog } from "./locations";
import assert from "node:assert/strict";
import test from "node:test";

test("returns an ordered Location Catalog without database metadata", async () => {
  const supabase = {
    from: () => ({
      select: () => ({
        order: () => ({
          order: async () => ({
            data: [
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
            ],
            error: null,
          }),
        }),
      }),
    }),
  } as unknown as SupabaseClient<Database>;

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
