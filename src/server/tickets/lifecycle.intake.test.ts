import type { SupabaseClient } from "@supabase/supabase-js";

import { DEFAULT_MAX_PHOTOS } from "@/lib/storage/constants";
import type { Database } from "@/lib/supabase/database.types";

import { createTicket } from "./lifecycle";
import assert from "node:assert/strict";
import test from "node:test";

const baseInput = {
  categoryId: "category-1",
  spaceId: "space-1",
  description: "Projector cannot start",
  reporterName: "Alice",
  reporterEmail: "reporter@example.com",
  skipRevalidation: true,
};

function createFakeSupabase(options: { readinessError?: unknown; uploadError?: unknown } = {}) {
  const state = {
    inserted: [] as Array<Record<string, unknown>>,
    readinessUpdates: [] as Array<Record<string, unknown>>,
    removedPaths: [] as string[],
    deleted: 0,
  };

  const supabase = {
    from: (table: string) => {
      if (table === "tickets") {
        return {
          insert: (payload: Record<string, unknown>) => {
            state.inserted.push(payload);
            return {
              select: () => ({
                single: async () => ({ data: { id: "ticket-1" }, error: null }),
              }),
            };
          },
          update: (payload: Record<string, unknown>) => {
            state.readinessUpdates.push(payload);
            return {
              eq: async () => ({ error: options.readinessError ?? null }),
            };
          },
          delete: () => ({
            eq: async () => {
              state.deleted++;
              return { error: null };
            },
          }),
        };
      }

      if (table === "ticket_photos") {
        return {
          insert: async () => ({ error: null }),
          delete: () => ({
            in: async () => ({ error: null }),
          }),
        };
      }

      throw new Error(`Unexpected table: ${table}`);
    },
    storage: {
      from: () => ({
        upload: async () => ({ error: options.uploadError ?? null }),
        remove: async (paths: string[]) => {
          state.removedPaths.push(...paths);
          return { error: null };
        },
      }),
    },
  } as unknown as SupabaseClient<Database>;

  return { supabase, state };
}

test("marks a Ticket ready for notification after photos are submitted", async () => {
  const { supabase, state } = createFakeSupabase();

  const result = await createTicket(supabase, {
    ...baseInput,
    photosBase64: ["aGk="],
  });

  assert.deepEqual(result, { success: true, data: { ticketId: "ticket-1" } });
  assert.equal(state.inserted.length, 1);
  assert.equal("notification_ready_at" in state.inserted[0], false);
  assert.equal(state.readinessUpdates.length, 1);
  assert.equal(typeof state.readinessUpdates[0].notification_ready_at, "string");
  assert.equal(state.deleted, 0);
});

test("does not mark an over-limit Ticket ready for notification", async () => {
  const { supabase, state } = createFakeSupabase();

  const result = await createTicket(supabase, {
    ...baseInput,
    photosBase64: Array.from({ length: DEFAULT_MAX_PHOTOS + 1 }, () => "aGk="),
  });

  assert.equal(result.success, false);
  assert.equal(result.success ? null : result.code, "VALIDATION_FAILED");
  assert.equal(state.readinessUpdates.length, 0);
  assert.equal(state.deleted, 1);
});

test("does not mark a Ticket ready when photo upload rolls back", async () => {
  const { supabase, state } = createFakeSupabase({
    uploadError: { message: "storage unavailable" },
  });

  const result = await createTicket(supabase, {
    ...baseInput,
    photosBase64: ["aGk="],
  });

  assert.equal(result.success, false);
  assert.equal(result.success ? null : result.code, "PHOTO_UPLOAD_FAILED");
  assert.equal(state.readinessUpdates.length, 0);
  assert.equal(state.deleted, 1);
});

test("returns a database error when the readiness update fails", async () => {
  const { supabase, state } = createFakeSupabase({
    readinessError: { message: "database unavailable" },
  });

  const result = await createTicket(supabase, {
    ...baseInput,
    photosBase64: ["aGk="],
  });

  assert.equal(result.success, false);
  assert.equal(result.success ? null : result.code, "DATABASE_ERROR");
  assert.equal(state.readinessUpdates.length, 1);
  assert.equal(state.removedPaths.length, 1);
  assert.match(state.removedPaths[0], /^report\/ticket-1\//);
  assert.equal(state.deleted, 1);
});
