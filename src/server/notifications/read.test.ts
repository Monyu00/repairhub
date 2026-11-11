import type { NotificationReadAdapter } from "./read";
import { getTechnicianNotifications, markAllTechnicianNotificationsRead, markTechnicianNotificationRead } from "./read";
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

function createUpdateAdapter(result: { data?: unknown; error?: Record<string, unknown> | null }) {
  const operations: CapturedOperation[] = [];
  const builder = {
    update: (...args: unknown[]) => {
      operations.push({ method: "update", args });
      return builder;
    },
    eq: (...args: unknown[]) => {
      operations.push({ method: "eq", args });
      return builder;
    },
    select: (...args: unknown[]) => {
      operations.push({ method: "select", args });
      return builder;
    },
    single: () => {
      operations.push({ method: "single", args: [] });
      return Promise.resolve({ data: result.data, error: result.error ?? null });
    },
    // biome-ignore lint/suspicious/noThenProperty: Supabase query builders are thenable.
    then: (resolve: (value: unknown) => unknown, reject: (reason?: unknown) => unknown) =>
      Promise.resolve({ data: result.data, error: result.error ?? null }).then(resolve, reject),
  };

  return { adapter: { from: () => builder } as unknown as NotificationReadAdapter, operations };
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

test("markTechnicianNotificationRead scopes the update to the owned notification", async () => {
  const notificationId = "00000000-0000-4000-8000-000000000002";
  const ticketId = "00000000-0000-4000-8000-000000000003";
  const { adapter, operations } = createUpdateAdapter({ data: { ticket_id: ticketId } });

  const result = await markTechnicianNotificationRead(adapter, "00000000-0000-4000-8000-000000000001", notificationId);

  assert.deepEqual(operations.find(({ method }) => method === "update")?.args, [{ is_read: true }]);
  assert.deepEqual(
    operations.filter(({ method }) => method === "eq").map(({ args }) => args),
    [
      ["id", notificationId],
      ["recipient_id", "00000000-0000-4000-8000-000000000001"],
    ],
  );
  assert.deepEqual(result, { success: true, ticketId });
});

test("markTechnicianNotificationRead fails closed for malformed input or ticket data", async () => {
  const malformedIdentity = createUpdateAdapter({ data: { ticket_id: "00000000-0000-4000-8000-000000000003" } });
  const malformedTicket = createUpdateAdapter({ data: { ticket_id: "ticket-1" } });

  assert.deepEqual(await markTechnicianNotificationRead(malformedIdentity.adapter, "not-a-user", "not-a-id"), {
    success: false,
  });
  assert.equal(malformedIdentity.operations.length, 0);
  assert.deepEqual(
    await markTechnicianNotificationRead(
      malformedTicket.adapter,
      "00000000-0000-4000-8000-000000000001",
      "00000000-0000-4000-8000-000000000002",
    ),
    { success: false },
  );
});

test("markAllTechnicianNotificationsRead scopes updates to unread rows", async () => {
  const { adapter, operations } = createUpdateAdapter({});

  const result = await markAllTechnicianNotificationsRead(adapter, "00000000-0000-4000-8000-000000000001");

  assert.deepEqual(operations.find(({ method }) => method === "update")?.args, [{ is_read: true }]);
  assert.deepEqual(
    operations.filter(({ method }) => method === "eq").map(({ args }) => args),
    [
      ["recipient_id", "00000000-0000-4000-8000-000000000001"],
      ["is_read", false],
    ],
  );
  assert.deepEqual(result, { success: true });
});
