import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/database.types";
import type { TicketStatus } from "@/server/tickets/lifecycle";

import { queryTickets } from "./query";
import assert from "node:assert/strict";
import test from "node:test";

const viewer = { role: null };

test("queryTickets rejects invalid external identifiers without querying", async () => {
  const supabase = {
    from: () => {
      throw new Error("Unexpected database lookup");
    },
  } as unknown as SupabaseClient<Database>;

  const result = await queryTickets(supabase, {
    id: "not-a-ticket",
    categoryId: "not-a-category",
    spaceId: "not-a-space",
    buildingId: "not-a-building",
    assignedTo: "not-a-technician",
    viewerContext: viewer,
  });

  assert.deepEqual(result, { tickets: [], totalCount: 0 });
});

test("queryTickets rejects unknown Ticket statuses without querying", async () => {
  const supabase = {
    from: () => ({
      select: () => ({
        in: (column: string, values: string[]) => {
          if (column === "status" && values.includes("invalid")) {
            throw new Error("Unexpected invalid status query");
          }

          throw new Error("Unexpected status query");
        },
      }),
    }),
  } as unknown as SupabaseClient<Database>;

  const result = await queryTickets(supabase, {
    status: ["invalid"] as unknown as TicketStatus[],
    viewerContext: viewer,
  });

  assert.deepEqual(result, { tickets: [], totalCount: 0 });
});

test("queryTickets filters by building without unsupported embedded OR", async () => {
  const buildingId = "00000000-0000-4000-8000-000000000001";
  const requests: string[] = [];
  const supabase = createClient("http://localhost", "test-key", {
    global: {
      fetch: async (input) => {
        requests.push(input.toString());
        return new Response("[]", {
          headers: { "content-range": "*/0", "content-type": "application/json" },
        });
      },
    },
  }) as unknown as SupabaseClient<Database>;

  const result = await queryTickets(supabase, { buildingId, viewerContext: viewer });

  assert.deepEqual(result, { tickets: [], totalCount: 0 });
  assert.equal(requests.length, 1);
  const params = new URL(requests[0]).searchParams;
  assert.equal(params.get("building.id"), `eq.${buildingId}`);
  assert.equal(params.get("space.building_id"), `eq.${buildingId}`);
  assert.equal(params.get("or"), "(building.not.is.null,space.not.is.null)");
});
