import type { SupabaseClient } from "@supabase/supabase-js";

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
