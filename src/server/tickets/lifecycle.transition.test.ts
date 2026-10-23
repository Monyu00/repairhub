import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/database.types";

import { transitionTicket } from "./lifecycle";
import assert from "node:assert/strict";
import test from "node:test";

test("claim transition returns the pending to in_progress contract", async () => {
  const rpcCalls: Array<{ name: string; args: Record<string, string> }> = [];
  const ticketId = "ticket-1";
  const technicianId = "technician-1";

  const supabase = {
    from: (table: string) => {
      if (table !== "tickets") {
        throw new Error(`Unexpected table: ${table}`);
      }

      return {
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({
              data: {
                id: ticketId,
                status: "pending",
                assigned_to: null,
                reporter_email: "reporter@example.com",
              },
              error: null,
            }),
          }),
        }),
      };
    },
    rpc: async (name: string, args: Record<string, string>) => {
      rpcCalls.push({ name, args });
      return { data: true, error: null };
    },
  } as unknown as SupabaseClient<Database>;

  const result = await transitionTicket(supabase, {
    ticketId,
    actor: { type: "technician", userId: technicianId },
    transition: "claim",
    skipRevalidation: true,
  });

  assert.deepEqual(result, {
    success: true,
    data: {
      ticketId,
      previousStatus: "pending",
      newStatus: "in_progress",
      assignedTo: technicianId,
    },
  });
  assert.deepEqual(rpcCalls, [
    {
      name: "claim_ticket",
      args: {
        p_ticket_id: ticketId,
        p_technician_id: technicianId,
      },
    },
  ]);
});
