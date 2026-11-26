import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/database.types";

import type { TicketDetailViewer } from "./capabilities";
import { addProgressNote } from "./progress-note";
import assert from "node:assert/strict";
import test from "node:test";

function createFakeSupabase(
  options: { ticket?: Record<string, unknown>; ticketError?: unknown; insertError?: unknown } = {},
) {
  const state = { inserted: [] as Array<Record<string, unknown>> };

  const supabase = {
    from: (table: string) => {
      if (table === "tickets") {
        return {
          select: () => ({
            eq: () => ({
              single: async () => ({ data: options.ticket ?? null, error: options.ticketError ?? null }),
            }),
          }),
        };
      }

      if (table === "ticket_notes") {
        return {
          insert: (payload: Record<string, unknown>) => {
            state.inserted.push(payload);
            return Promise.resolve({ error: options.insertError ?? null });
          },
        };
      }

      throw new Error(`Unexpected table: ${table}`);
    },
  } as unknown as SupabaseClient<Database>;

  return { supabase, state };
}

test("Admin can add a Progress Note with the existing insert payload", async () => {
  const { supabase, state } = createFakeSupabase({
    ticket: { id: "ticket-1", status: "completed", assigned_to: "technician-1" },
  });

  const result = await addProgressNote(supabase, {
    ticketId: "ticket-1",
    content: "  Replaced the projector lamp.  ",
    viewer: { role: "admin", userId: "admin-1" },
  });

  assert.deepEqual(result, { success: true });
  assert.deepEqual(state.inserted, [
    {
      ticket_id: "ticket-1",
      author_id: "admin-1",
      content: "Replaced the projector lamp.",
      type: "note",
    },
  ]);
});

test("Assigned technician can add a Progress Note", async () => {
  const { supabase, state } = createFakeSupabase({
    ticket: { id: "ticket-1", status: "pending", assigned_to: "technician-1" },
  });

  const result = await addProgressNote(supabase, {
    ticketId: "ticket-1",
    content: "Diagnosed the power issue.",
    viewer: { role: "technician", userId: "technician-1" },
  });

  assert.deepEqual(result, { success: true });
  assert.equal(state.inserted[0]?.author_id, "technician-1");
});

test("Unassigned technician cannot add a Progress Note", async () => {
  const { supabase, state } = createFakeSupabase({
    ticket: { id: "ticket-1", status: "pending", assigned_to: "technician-1" },
  });

  const result = await addProgressNote(supabase, {
    ticketId: "ticket-1",
    content: "Not my ticket.",
    viewer: { role: "technician", userId: "technician-2" },
  });

  assert.deepEqual(result, { success: false, error: "無權限為此單據新增進度備註" });
  assert.equal(state.inserted.length, 0);
});

test("Reporter and null-role viewers cannot add a Progress Note", async () => {
  const ticket = { id: "ticket-1", status: "pending", assigned_to: null };

  for (const viewer of [
    { role: null, userId: "reporter-1" },
    { role: null, userId: null },
  ]) {
    const { supabase, state } = createFakeSupabase({ ticket });

    const result = await addProgressNote(supabase, {
      ticketId: "ticket-1",
      content: "Reader cannot write notes.",
      viewer,
    });

    assert.deepEqual(result, { success: false, error: "無權限為此單據新增進度備註" });
    assert.equal(state.inserted.length, 0);
  }
});

test("Rejects whitespace-only content and trims valid content", async () => {
  const ticket = { id: "ticket-1", status: "pending", assigned_to: "technician-1" };
  const viewer: TicketDetailViewer = { role: "technician", userId: "technician-1" };
  const blank = createFakeSupabase({ ticket });

  const blankResult = await addProgressNote(blank.supabase, {
    ticketId: "ticket-1",
    content: "   ",
    viewer,
  });

  assert.deepEqual(blankResult, { success: false, error: "備註內容不可為空白" });
  assert.equal(blank.state.inserted.length, 0);

  const normalized = createFakeSupabase({ ticket });
  const normalizedResult = await addProgressNote(normalized.supabase, {
    ticketId: "ticket-1",
    content: "  Ordered a replacement part.  ",
    viewer,
  });

  assert.deepEqual(normalizedResult, { success: true });
  assert.equal(normalized.state.inserted[0]?.content, "Ordered a replacement part.");
});

test("Missing Ticket returns not found without inserting", async () => {
  const { supabase, state } = createFakeSupabase({ ticketError: { message: "not found" } });

  const result = await addProgressNote(supabase, {
    ticketId: "ticket-1",
    content: "Stale note.",
    viewer: { role: "admin", userId: "admin-1" },
  });

  assert.deepEqual(result, { success: false, error: "找不到該單據" });
  assert.equal(state.inserted.length, 0);
});

test("Insert failure returns the existing generic error", async () => {
  const { supabase, state } = createFakeSupabase({
    ticket: { id: "ticket-1", status: "pending", assigned_to: "technician-1" },
    insertError: { message: "database unavailable" },
  });

  const result = await addProgressNote(supabase, {
    ticketId: "ticket-1",
    content: "Failed note.",
    viewer: { role: "technician", userId: "technician-1" },
  });

  assert.deepEqual(result, { success: false, error: "新增備註失敗，請稍後再試" });
  assert.equal(state.inserted.length, 1);
});
