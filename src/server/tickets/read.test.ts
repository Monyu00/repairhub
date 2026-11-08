import type { Database } from "@/lib/supabase/database.types";

import { getMyTickets, getPublicTickets, getTechnicianQueueTickets, type TicketReadAdapter } from "./read";
import assert from "node:assert/strict";
import test from "node:test";

type CapturedOperation = {
  method: string;
  args: unknown[];
};

function createInMemoryAdapter({
  data = [],
  count = data.length,
  error = null,
}: {
  data?: unknown[];
  count?: number;
  error?: Record<string, unknown> | null;
} = {}) {
  const operations: CapturedOperation[] = [];
  const builder = {
    select: (...args: unknown[]) => {
      operations.push({ method: "select", args });
      return builder;
    },
    in: (...args: unknown[]) => {
      operations.push({ method: "in", args });
      return builder;
    },
    eq: (...args: unknown[]) => {
      operations.push({ method: "eq", args });
      return builder;
    },
    filter: (...args: unknown[]) => {
      operations.push({ method: "filter", args });
      return builder;
    },
    or: (...args: unknown[]) => {
      operations.push({ method: "or", args });
      return builder;
    },
    ilike: (...args: unknown[]) => {
      operations.push({ method: "ilike", args });
      return builder;
    },
    order: (...args: unknown[]) => {
      operations.push({ method: "order", args });
      return builder;
    },
    range: (...args: unknown[]) => {
      operations.push({ method: "range", args });
      return Promise.resolve({ data, count, error });
    },
  };
  const adapter = { from: () => builder };

  return { adapter: adapter as unknown as TicketReadAdapter, operations };
}

function createTechnicianQueueAdapter({
  categoryIds = [],
  categoryError = null,
  data = [],
  count = data.length,
  error = null,
}: {
  categoryIds?: string[];
  categoryError?: Record<string, unknown> | null;
  data?: unknown[];
  count?: number;
  error?: Record<string, unknown> | null;
} = {}) {
  const operations: CapturedOperation[] = [];

  const createBuilder = (result: { data: unknown[]; count: number; error: Record<string, unknown> | null }) => {
    const builder = {
      select: (...args: unknown[]) => {
        operations.push({ method: "select", args });
        return builder;
      },
      eq: (...args: unknown[]) => {
        operations.push({ method: "eq", args });
        return builder;
      },
      in: (...args: unknown[]) => {
        operations.push({ method: "in", args });
        return builder;
      },
      order: (...args: unknown[]) => {
        operations.push({ method: "order", args });
        return builder;
      },
      range: (...args: unknown[]) => {
        operations.push({ method: "range", args });
        return Promise.resolve(result);
      },
      // biome-ignore lint/suspicious/noThenProperty: Supabase query builders are thenable.
      then: (resolve: (value: unknown) => unknown, reject: (reason?: unknown) => unknown) =>
        Promise.resolve(result).then(resolve, reject),
    };
    return builder;
  };

  const ticketBuilder = createBuilder({ data, count, error });
  const categoryBuilder = createBuilder({
    data: categoryIds.map((id) => ({ category_id: id })),
    count: categoryIds.length,
    error: categoryError,
  });
  const adapter = {
    from: (table: string) => (table === "technician_categories" ? categoryBuilder : ticketBuilder),
  };

  return { adapter: adapter as unknown as TicketReadAdapter, operations };
}

test("getPublicTickets applies default active statuses, public filters, pagination, and sorting", async () => {
  const buildingId = "00000000-0000-4000-8000-000000000001";
  const categoryId = "00000000-0000-4000-8000-000000000002";
  const { adapter, operations } = createInMemoryAdapter({
    data: [{ id: "ticket-1", reporter_email: "reporter@example.com" }],
    count: 12,
  });

  const result = await getPublicTickets(adapter, {
    page: 2,
    pageSize: 5,
    buildingId,
    categoryId,
    search: "projector",
  });

  assert.deepEqual(operations.find(({ method }) => method === "in")?.args, [
    "status",
    ["pending", "in_progress", "completed"],
  ]);
  assert.deepEqual(operations.find(({ method }) => method === "eq")?.args, ["category_id", categoryId]);
  assert.deepEqual(
    operations.filter(({ method }) => method === "filter").map(({ args }) => args),
    [
      ["building.id", "eq", buildingId],
      ["space.building_id", "eq", buildingId],
    ],
  );
  assert.equal(operations.filter(({ method }) => method === "or").length, 2);
  assert.deepEqual(operations.find(({ method }) => method === "order")?.args, ["created_at", { ascending: false }]);
  assert.deepEqual(operations.find(({ method }) => method === "range")?.args, [5, 9]);
  assert.equal(result.totalCount, 12);
  assert.equal(result.tickets[0]?.id, "ticket-1");
  assert.equal(result.tickets[0]?.reporterEmail, null);
});

test("getMyTickets filters by reporter email with default pagination and sorting", async () => {
  const { adapter, operations } = createInMemoryAdapter({
    data: [{ id: "ticket-1", reporter_email: "reporter@example.com" }],
    count: 18,
  });

  const result = await getMyTickets(adapter, {
    reporterEmail: "reporter@example.com",
    page: 2,
    pageSize: 5,
    viewerContext: { role: null, email: "reporter@example.com" },
  });

  assert.deepEqual(operations.find(({ method }) => method === "ilike")?.args, [
    "reporter_email",
    "reporter@example.com",
  ]);
  assert.deepEqual(operations.find(({ method }) => method === "order")?.args, ["created_at", { ascending: false }]);
  assert.deepEqual(operations.find(({ method }) => method === "range")?.args, [5, 9]);
  assert.equal(result.totalCount, 18);
  assert.equal(result.tickets[0]?.reporterEmail, "reporter@example.com");
});

test("getMyTickets fails closed for invalid input", async () => {
  const { adapter, operations } = createInMemoryAdapter();

  const result = await getMyTickets(adapter, {
    reporterEmail: "reporter@example.com",
    page: 0,
    pageSize: 0,
    viewerContext: { role: null, email: "reporter@example.com" },
  });

  assert.deepEqual(result, { tickets: [], totalCount: 0 });
  assert.equal(operations.length, 0);
});

test("getMyTickets fails closed when the read fails", async () => {
  const originalConsoleError = console.error;
  console.error = () => undefined;
  const { adapter, operations } = createInMemoryAdapter({ error: { message: "read failed" } });

  try {
    const result = await getMyTickets(adapter, {
      reporterEmail: "reporter@example.com",
      page: 1,
      pageSize: 5,
      viewerContext: { role: null, email: "reporter@example.com" },
    });

    assert.deepEqual(result, { tickets: [], totalCount: 0 });
    assert.equal(operations.length, 4);
  } finally {
    console.error = originalConsoleError;
  }
});

test("getPublicTickets fails closed for invalid public list input", async () => {
  const { adapter, operations } = createInMemoryAdapter();

  const result = await getPublicTickets(adapter, { page: 0, pageSize: 0 });

  assert.deepEqual(result, { tickets: [], totalCount: 0 });
  assert.equal(operations.length, 0);
});

test("getPublicTickets fails closed when the read fails", async () => {
  const originalConsoleError = console.error;
  console.error = () => undefined;
  const { adapter, operations } = createInMemoryAdapter({ error: { message: "read failed" } });

  try {
    const result = await getPublicTickets(adapter, { page: 1, pageSize: 5 });

    assert.deepEqual(result, { tickets: [], totalCount: 0 });
    assert.equal(operations.length, 4);
  } finally {
    console.error = originalConsoleError;
  }
});

test("getTechnicianQueueTickets applies pending status, subscribed categories, default ordering, and redaction", async () => {
  const categoryIds = ["00000000-0000-4000-8000-000000000002", "00000000-0000-4000-8000-000000000003"];
  const { adapter, operations } = createTechnicianQueueAdapter({
    categoryIds,
    data: [{ id: "ticket-1", reporter_email: "reporter@example.com" }],
    count: 1,
  });

  const result = await getTechnicianQueueTickets(adapter, {
    technicianId: "00000000-0000-4000-8000-000000000001",
    viewerContext: { role: "technician" },
  });

  assert.deepEqual(
    operations.filter(({ method }) => method === "eq").map(({ args }) => args),
    [
      ["technician_id", "00000000-0000-4000-8000-000000000001"],
      ["status", "pending"],
    ],
  );
  assert.deepEqual(operations.find(({ method }) => method === "in")?.args, ["category_id", categoryIds]);
  assert.deepEqual(operations.find(({ method }) => method === "order")?.args, ["created_at", { ascending: false }]);
  assert.equal(
    operations.find(({ method }) => method === "range"),
    undefined,
  );
  assert.deepEqual(result.subscribedCategoryIds, categoryIds);
  assert.equal(result.totalCount, 1);
  assert.equal(result.tickets[0]?.reporterEmail, "reporter@example.com");
});

test("getTechnicianQueueTickets fails closed when category subscription cannot be read", async () => {
  const { adapter, operations } = createTechnicianQueueAdapter({ categoryError: { message: "read failed" } });

  const result = await getTechnicianQueueTickets(adapter, {
    technicianId: "00000000-0000-4000-8000-000000000001",
    viewerContext: { role: "technician" },
  });

  assert.deepEqual(result, { tickets: [], totalCount: 0, subscribedCategoryIds: [] });
  assert.equal(operations.length, 2);
});

test("getTechnicianQueueTickets fails closed when the ticket read fails", async () => {
  const originalConsoleError = console.error;
  console.error = () => undefined;
  const categoryId = "00000000-0000-4000-8000-000000000002";
  const { adapter, operations } = createTechnicianQueueAdapter({
    categoryIds: [categoryId],
    error: { message: "ticket read failed" },
  });

  try {
    const result = await getTechnicianQueueTickets(adapter, {
      technicianId: "00000000-0000-4000-8000-000000000001",
      viewerContext: { role: "technician" },
    });

    assert.deepEqual(result, { tickets: [], totalCount: 0, subscribedCategoryIds: [categoryId] });
    assert.equal(operations.length, 6);
  } finally {
    console.error = originalConsoleError;
  }
});
