import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/database.types";

import { type AccountListAdapter, createSupabaseAccountListAdapter, readAccountList } from "./list";
import assert from "node:assert/strict";
import test from "node:test";

function adapter(source: Awaited<ReturnType<AccountListAdapter["readList"]>>): AccountListAdapter {
  return {
    async readList() {
      return source;
    },
  };
}

test("projects accounts, resolves notification preferences, and sorts by projection", async () => {
  const accounts = await readAccountList(
    adapter([
      {
        user: {
          id: "inactive-admin",
          email: "inactive@example.com",
          created_at: "2026-01-02T00:00:00.000Z",
          last_sign_in_at: "2026-01-03T00:00:00.000Z",
          user_metadata: { user_role: "admin" },
        },
        profile: { user_role: null, is_active: false, notification_preferences: { new_ticket: false } },
      },
      {
        user: {
          id: "technician",
          email: "tech@example.com",
          created_at: "2026-01-01T00:00:00.000Z",
          last_sign_in_at: null,
        },
        profile: {
          display_name: "Profile Name",
          user_role: "technician",
          department: "資訊中心",
          phone: "0912345678",
          is_active: true,
          must_change_password: true,
        },
      },
    ]),
  );

  assert.deepEqual(accounts, [
    {
      id: "technician",
      email: "tech@example.com",
      displayName: "Profile Name",
      role: "technician",
      department: "資訊中心",
      phone: "0912345678",
      avatarUrl: null,
      isActive: true,
      mustChangePassword: true,
      createdAt: "2026-01-01T00:00:00.000Z",
      lastSignInAt: null,
      notificationPreferences: { ticketStatus: true, newTicket: true },
    },
    {
      id: "inactive-admin",
      email: "inactive@example.com",
      displayName: null,
      role: "admin",
      department: null,
      phone: null,
      avatarUrl: null,
      isActive: false,
      mustChangePassword: false,
      createdAt: "2026-01-02T00:00:00.000Z",
      lastSignInAt: "2026-01-03T00:00:00.000Z",
      notificationPreferences: { ticketStatus: true, newTicket: false },
    },
  ]);
});

test("excludes users without a profile", async () => {
  const accounts = await readAccountList(
    adapter([
      {
        user: {
          id: "without-profile",
          email: "orphan@example.com",
          created_at: "2026-01-01T00:00:00.000Z",
        },
        profile: null,
      },
      {
        user: {
          id: "with-profile",
          email: "profile@example.com",
          created_at: "2026-01-01T00:00:00.000Z",
        },
        profile: { user_role: "technician" },
      },
    ]),
  );

  assert.deepEqual(
    accounts.map((account) => account.id),
    ["with-profile"],
  );
});

test("surfaces account list read errors", async () => {
  await assert.rejects(
    readAccountList({
      async readList() {
        throw new Error("account list read failed");
      },
    }),
    /account list read failed/u,
  );
});

test("list adapter requests one page with the maximum size", async () => {
  const listUsersCalls: Array<{ page?: number; perPage?: number }> = [];
  const supabase = {
    auth: {
      admin: {
        async listUsers(options: { page?: number; perPage?: number }) {
          listUsersCalls.push(options);
          return { data: { users: [] }, error: null };
        },
      },
    },
    from: () => ({
      select: async () => ({ data: [], error: null }),
    }),
  } as unknown as SupabaseClient<Database>;

  await createSupabaseAccountListAdapter(supabase).readList();

  assert.deepEqual(listUsersCalls, [{ page: 1, perPage: 1000 }]);
});
