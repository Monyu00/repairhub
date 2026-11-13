import type { NotificationReadAdapter } from "./read";
import { getNotifications, markAllNotificationsReadForUser, markNotificationReadForUser } from "./read";
import assert from "node:assert/strict";
import test from "node:test";

type ReadResult = {
  data: unknown[];
  count: number | null;
  error: Record<string, unknown> | null;
};

type UpdateResult = {
  data?: unknown;
  error?: Record<string, unknown> | null;
};

function createBuilder(result: ReadResult) {
  const builder = {
    select: () => builder,
    eq: () => builder,
    order: () => builder,
    range: () => Promise.resolve(result),
    // biome-ignore lint/suspicious/noThenProperty: Supabase query builders are thenable.
    then: (resolve: (value: ReadResult) => unknown, reject: (reason?: unknown) => unknown) =>
      Promise.resolve(result).then(resolve, reject),
  };

  return builder;
}

function createUpdateBuilder(result: UpdateResult) {
  const builder = {
    update: () => builder,
    eq: () => builder,
    select: () => builder,
    single: () => Promise.resolve({ data: result.data, error: result.error ?? null }),
    // biome-ignore lint/suspicious/noThenProperty: Supabase update builders are thenable.
    then: (
      resolve: (value: { data: unknown; error: Record<string, unknown> | null }) => unknown,
      reject: (reason?: unknown) => unknown,
    ) => Promise.resolve({ data: result.data, error: result.error ?? null }).then(resolve, reject),
  };

  return builder;
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
  let callCount = 0;
  const adapter = {
    from: () => {
      callCount += 1;
      return callCount === 1 ? list : unread;
    },
  };

  return { adapter: adapter as unknown as NotificationReadAdapter, queryCount: () => callCount };
}

function createUpdateAdapter({ data, error = null }: UpdateResult) {
  const builder = createUpdateBuilder({ data, error });
  let callCount = 0;
  const adapter = {
    from: () => {
      callCount += 1;
      return builder;
    },
  };

  return { adapter: adapter as unknown as NotificationReadAdapter, queryCount: () => callCount };
}

const notificationRow = (eventType: string) => ({
  id: "notification-1",
  ticket_id: "ticket-1",
  event_type: eventType,
  is_read: false,
  created_at: "2026-11-12T01:00:00.000Z",
});

const notificationExpectation = (eventType: string) => ({
  id: "notification-1",
  ticketId: "ticket-1",
  eventType,
  isRead: false,
  createdAt: "2026-11-12T01:00:00.000Z",
});

const userId = "00000000-0000-4000-8000-000000000001";

test("getNotifications maps every supported event type and exact unread count", async () => {
  const eventTypes = ["new_ticket", "assigned", "pending", "in_progress", "completed", "closed", "cancelled"];

  for (const eventType of eventTypes) {
    const { adapter } = createAdapter({ data: [notificationRow(eventType)], unreadCount: 7 });

    assert.deepEqual(await getNotifications(adapter, userId), {
      notifications: [notificationExpectation(eventType)],
      unreadCount: 7,
    });
  }
});

test("getNotifications fails closed for a malformed identity without querying", async () => {
  const { adapter, queryCount } = createAdapter({ data: [notificationRow("new_ticket")] });

  assert.deepEqual(await getNotifications(adapter, "not-a-user"), {
    notifications: [],
    unreadCount: 0,
  });
  assert.equal(queryCount(), 0);
});

test("getNotifications fails closed when either read fails", async () => {
  const originalConsoleError = console.error;
  console.error = () => undefined;

  try {
    const listFailure = createAdapter({ error: { message: "list failed" }, unreadCount: 2 });
    const unreadFailure = createAdapter({
      data: [notificationRow("new_ticket")],
      unreadError: { message: "count failed" },
      unreadCount: 2,
    });

    assert.deepEqual(await getNotifications(listFailure.adapter, userId), {
      notifications: [],
      unreadCount: 0,
    });
    assert.deepEqual(await getNotifications(unreadFailure.adapter, userId), {
      notifications: [],
      unreadCount: 0,
    });
  } finally {
    console.error = originalConsoleError;
  }
});

test("getNotifications fails closed for an unsupported event type", async () => {
  const originalConsoleError = console.error;
  console.error = () => undefined;

  try {
    const { adapter } = createAdapter({ data: [notificationRow("unknown")] });

    assert.deepEqual(await getNotifications(adapter, userId), {
      notifications: [],
      unreadCount: 0,
    });
  } finally {
    console.error = originalConsoleError;
  }
});

test("markNotificationReadForUser returns the ticket and fails closed for malformed data", async () => {
  const ticketId = "00000000-0000-4000-8000-000000000003";
  const notificationId = "00000000-0000-4000-8000-000000000002";
  const success = createUpdateAdapter({ data: { ticket_id: ticketId } });
  const malformed = createUpdateAdapter({ data: { ticket_id: "ticket-1" } });

  assert.deepEqual(await markNotificationReadForUser(success.adapter, userId, notificationId), {
    success: true,
    ticketId,
  });
  assert.deepEqual(await markNotificationReadForUser(malformed.adapter, userId, notificationId), {
    success: false,
  });
});

test("markNotificationReadForUser rejects malformed input without querying", async () => {
  const { adapter, queryCount } = createUpdateAdapter({ data: { ticket_id: "00000000-0000-4000-8000-000000000003" } });

  assert.deepEqual(await markNotificationReadForUser(adapter, "not-a-user", "not-a-id"), {
    success: false,
  });
  assert.equal(queryCount(), 0);
});

test("markAllNotificationsReadForUser returns success or a fail-closed result", async () => {
  const success = createUpdateAdapter({});
  const failure = createUpdateAdapter({ error: { message: "update failed" } });

  assert.deepEqual(await markAllNotificationsReadForUser(success.adapter, userId), { success: true });
  assert.deepEqual(await markAllNotificationsReadForUser(failure.adapter, userId), { success: false });
});
