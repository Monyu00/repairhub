import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/database.types";

import { getTicketDetail } from "./detail";
import assert from "node:assert/strict";
import test from "node:test";

function createFakeSupabase() {
  const ticketRow = {
    id: "ticket-1",
    status: "completed",
    category_id: "category-1",
    space_id: "space-1",
    description: "Projector does not start",
    equipment_id: "equipment-1",
    equipment_name: "Classroom projector",
    reporter_name: "Alice",
    reporter_department: "Physics",
    reporter_email: "alice@example.com",
    reporter_phone: "0912345678",
    assigned_to: "technician-1",
    rating: 5,
    rated_at: "2026-10-01T00:00:00.000Z",
    created_at: "2026-09-01T00:00:00.000Z",
    updated_at: "2026-10-01T00:00:00.000Z",
    category: [{ id: "category-1", name: "Electrical" }],
    space: [
      {
        id: "space-1",
        name: "Room 101",
        floor: 1,
        building_id: "building-1",
        building: [{ id: "building-1", name: "Science Building", code: "SC" }],
      },
    ],
    assigned_technician: [{ id: "technician-1", display_name: "Bob" }],
  };

  return {
    from: (table: string) => {
      if (table === "tickets") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: ticketRow, error: null }),
            }),
          }),
        };
      }

      if (table === "ticket_photos") {
        return {
          select: () => ({
            eq: () => ({
              order: async () => ({
                data: [{ id: "photo-1", storage_path: "report/ticket-1/photo.jpg", phase: "report" }],
                error: null,
              }),
            }),
          }),
        };
      }

      return {
        select: () => ({
          eq: () => ({
            order: async () => ({
              data: [
                {
                  id: "note-1",
                  content: "Replaced the bulb",
                  type: "note",
                  created_at: "2026-09-30T00:00:00.000Z",
                  author: [{ id: "technician-1", user_role: "technician", display_name: "Bob" }],
                },
              ],
              error: null,
            }),
          }),
        }),
      };
    },
    storage: {
      from: () => ({
        getPublicUrl: (path: string) => ({
          data: { publicUrl: `https://supabase.test/storage/v1/object/public/ticket-photos/${path}` },
        }),
      }),
    },
  } as unknown as SupabaseClient<Database>;
}

test("getTicketDetail redacts reporter and author data for public viewers", async () => {
  const supabase = createFakeSupabase();

  const detail = await getTicketDetail(supabase, "ticket-1", { role: null });

  assert.ok(detail);
  assert.equal(detail.ticket.equipmentName, "Classroom projector");
  assert.equal(detail.ticket.reporterEmail, null);
  assert.equal(detail.notes[0]?.authorName, null);
  assert.equal(
    detail.photos[0]?.url,
    "https://supabase.test/storage/v1/object/public/ticket-photos/report/ticket-1/photo.jpg",
  );
});

test("getTicketDetail exposes reporter and author data for technicians", async () => {
  const supabase = createFakeSupabase();

  const detail = await getTicketDetail(supabase, "ticket-1", { role: "technician" });

  assert.ok(detail);
  assert.equal(detail.ticket.reporterEmail, "alice@example.com");
  assert.equal(detail.notes[0]?.authorRole, "technician");
  assert.equal(detail.notes[0]?.authorName, "Bob");
});
