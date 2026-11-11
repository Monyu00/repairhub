import type { NotificationReadAdapter } from "./read";
import { getTechnicianNotifications } from "./read";
import assert from "node:assert/strict";
import test from "node:test";

type CapturedOperation = {
  method: string;
  args: unknown[];
};

function createBuilder(result: { data: unknown[]; count: number | null; error: Record<string, unknown> | null }) {
  const operations: CapturedOperation[] = [];
  const builder = {
    select: (...args: unknown[]) => {
      operations.push({ method: "select", args });
      return builder;
    },
    eq: (...args: unknown[]) => {
      operations.push({ method: "eq", args });
      return builder;
    },
    // biome-ignore lint/suspicious/noThenProperty: Supabase query builders are thenable.
    then: (resolve: (value: unknown) => unknown, reject: (reason?: unknown) => unknown) =>
      Promise.resolve(result).then(resolve, reject),
    order: (...args: unknown[]) => {
      operations.push({ method: "order", args });
      return builder;
    },
    range: (...args: unknown[]) => {
      operations.push({ method: "range", args });
      return Promise.resolve(result);
    },
  };

  return { builder, operations };
}

function createAdapter({
  data = [],
  count = data.length,
  unreadCount = 0,
  error = null,
  unreadError = null,
}: {
  data?: unknown[];
  count?: number;
  unreadCount?: number;
  error?: Record<string, unknown> | null;
  unreadError?: Record<string, unknown> | null;
} = {}) {
  const list = createBuilder({ data, count, error });
  const unread = createBuilder({ data: [], count: unreadCount, error: unreadError });
  let calls = 0;
  const adapter = {
    from: () => {
      calls += 1;
      return calls === 1 ? list.builder : unread.builder;
    },
  };

  return { adapter: adapter as unknown as NotificationReadAdapter, list, unread };
}

test("getTechnicianNotifications scopes by recipient, orders, limits, and returns the exact unread count", async () => {
  const rows = [
    {
      id: "notification-2",
      ticket_id: "ticket-2",
      is_read: true,
      created_at: "2026-11-12T02:00:00.000Z",
    },
    {
      id: "notification-1",
      ticket_id: "ticket-1",
      is_read: false,
      created_at: "2026-11-12T01:00:00.000Z",
    },
  ];
  const { adapter, list, unread } = createAdapter({ data: rows, unreadCount: 7 });

  const result = await getTechnicianNotifications(adapter, "00000000-0000-4000-8000-000000000001");

  assert.deepEqual(list.operations.find(({ method }) => method === "eq")?.args, [
    "recipient_id",
    "00000000-0000-4000-8000-000000000001",
  ]);
  assert.deepEqual(list.operations.find(({ method }) => method === "order")?.args, [
    "created_at",
    { ascending: false },
  ]);
  assert.deepEqual(list.operations.find(({ method }) => method === "range")?.args, [0, 19]);
  assert.deepEqual(
    unread.operations.filter(({ method }) => method === "eq").map(({ args }) => args),
    [
      ["recipient_id", "00000000-0000-4000-8000-000000000001"],
      ["is_read", false],
    ],
  );
  assert.deepEqual(result, {
    notifications: [
      { id: "notification-2", ticketId: "ticket-2", isRead: true, createdAt: "2026-11-12T02:00:00.000Z" },
      { id: "notification-1", ticketId: "ticket-1", isRead: false, createdAt: "2026-11-12T01:00:00.000Z" },
    ],
    unreadCount: 7,
  });
});

test("getTechnicianNotifications fails closed for a malformed identity without querying", async () => {
  const { adapter, list, unread } = createAdapter({ data: [{ id: "notification-1" }] });

  const result = await getTechnicianNotifications(adapter, "not-a-user");

  assert.deepEqual(result, { notifications: [], unreadCount: 0 });
  assert.equal(list.operations.length, 0);
  assert.equal(unread.operations.length, 0);
});

test("getTechnicianNotifications fails closed when either read fails", async () => {
  const originalConsoleError = console.error;
  console.error = () => undefined;

  try {
    const listFailure = createAdapter({ error: { message: "list failed" }, unreadCount: 2 });
    const listResult = await getTechnicianNotifications(listFailure.adapter, "00000000-0000-4000-8000-000000000001");
    const unreadFailure = createAdapter({
      data: [{ id: "notification-1", ticket_id: "ticket-1", is_read: true, created_at: "2026-11-12T01:00:00.000Z" }],
      unreadError: { message: "count failed" },
      unreadCount: 2,
    });
    const unreadResult = await getTechnicianNotifications(
      unreadFailure.adapter,
      "00000000-0000-4000-8000-000000000001",
    );

    assert.deepEqual(listResult, { notifications: [], unreadCount: 0 });
    assert.deepEqual(unreadResult, { notifications: [], unreadCount: 0 });
  } finally {
    console.error = originalConsoleError;
  }
});
