import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/database.types";

import { fetchDashboardSummary } from "./dashboard-summary-loader";
import assert from "node:assert/strict";
import test from "node:test";

const rawTicket = {
  id: "00000000-0000-4000-8000-000000000001",
  status: "pending",
  category_id: "00000000-0000-4000-8000-000000000002",
  building_id: "00000000-0000-4000-8000-000000000003",
  space_id: null,
  description: "走廊燈具閃爍",
  equipment_id: null,
  equipment_name: null,
  reporter_name: "王小明",
  reporter_department: "總務處",
  reporter_email: "reporter@example.com",
  reporter_phone: "0912345678",
  assigned_to: "00000000-0000-4000-8000-000000000004",
  rating: null,
  rated_at: null,
  created_at: "2026-11-04T01:00:00.000Z",
  updated_at: "2026-11-04T02:00:00.000Z",
  category: { id: "00000000-0000-4000-8000-000000000002", name: "水電" },
  building: { id: "00000000-0000-4000-8000-000000000003", name: "行政大樓", code: "ADM" },
  space: null,
  assigned_technician: null,
};

function response(body: unknown, status = 200, total?: number) {
  const headers = new Headers({ "content-type": "application/json" });
  if (total !== undefined) {
    headers.set("content-range", `*/${total}`);
  }

  return new Response(body === null ? null : JSON.stringify(body), { status, headers });
}

function createTestSupabase(respond: (request: Request) => Response | Promise<Response>) {
  const requests: Request[] = [];
  const supabase = createClient("http://localhost", "test-key", {
    global: {
      fetch: async (input, init) => {
        const request = input instanceof Request ? input : new Request(input, init);
        requests.push(request);
        return respond(request);
      },
    },
  }) as unknown as SupabaseClient<Database>;

  return { requests, supabase };
}

test("Dashboard summary returns Admin counts, 90-day average, and the open queue from count-only queries", async () => {
  const { requests, supabase } = createTestSupabase((request) => {
    const url = new URL(request.url);
    const params = url.searchParams;

    if (request.method === "HEAD") {
      const status = params.get("status");
      const total = status?.includes("pending") ? 7 : status?.includes("in_progress") ? 2 : 3;
      return response(null, 200, total);
    }

    if (params.get("select") === "created_at,updated_at") {
      return response([
        { created_at: "2026-11-01T00:00:00.000Z", updated_at: "2026-11-03T00:00:00.000Z" },
        { created_at: "2026-11-02T00:00:00.000Z", updated_at: "2026-11-02T00:00:00.000Z" },
      ]);
    }

    if (params.get("select")?.includes("category:categories")) {
      return response([rawTicket], 200, 1);
    }

    throw new Error(`Unexpected request: ${request.method} ${url}`);
  });

  const summary = await fetchDashboardSummary(supabase, { role: "admin" });

  assert.equal(summary.pendingCount, 7);
  assert.equal(summary.todayCount, 3);
  assert.equal(summary.inProgressCount, 2);
  assert.equal(summary.avgResolutionDays, 2);
  assert.equal(summary.openTickets.length, 1);

  const countRequests = requests.filter((request) => request.method === "HEAD");
  assert.equal(countRequests.length, 3);
  assert.ok(countRequests.every((request) => new URL(request.url).searchParams.get("select") === "id"));
});

test("Dashboard summary keeps Technician assigned and subscribed Category filters", async () => {
  const technicianId = "00000000-0000-4000-8000-000000000004";
  const categoryId = "00000000-0000-4000-8000-000000000002";
  const { requests, supabase } = createTestSupabase((request) => {
    const url = new URL(request.url);
    const params = url.searchParams;

    if (url.pathname.endsWith("/technician_categories")) {
      return response([{ category_id: categoryId }]);
    }

    if (request.method === "HEAD") {
      return response(null, 200, 1);
    }

    if (params.get("select") === "created_at,updated_at") {
      return response([{ created_at: "2026-11-01T00:00:00.000Z", updated_at: "2026-11-02T00:00:00.000Z" }]);
    }

    if (params.get("select")?.includes("category:categories")) {
      return response([rawTicket], 200, 1);
    }

    throw new Error(`Unexpected request: ${request.method} ${url}`);
  });

  const summary = await fetchDashboardSummary(supabase, { role: "technician", userId: technicianId });

  assert.equal(summary.pendingCount, 1);
  assert.equal(summary.openTickets.length, 1);
  assert.ok(
    requests
      .filter((request) => request.url.includes("/rest/v1/tickets"))
      .every((request) => new URL(request.url).searchParams.get("assigned_to") === `eq.${technicianId}`),
  );
  assert.ok(requests.some((request) => new URL(request.url).searchParams.get("category_id") === `in.(${categoryId})`));
});

test("Dashboard summary fails closed when a Technician profile or Category lookup is unavailable", async () => {
  const { requests, supabase } = createTestSupabase(() => response({ message: "denied" }, 500));

  const summary = await fetchDashboardSummary(supabase, {
    role: "technician",
    userId: "00000000-0000-4000-8000-000000000004",
  });

  assert.deepEqual(summary, {
    pendingCount: 0,
    todayCount: 0,
    inProgressCount: 0,
    avgResolutionDays: 0,
    openTickets: [],
  });
  assert.equal(requests.length, 1);
});
