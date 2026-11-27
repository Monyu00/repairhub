import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/database.types";

import { getTicketTransitionCapability } from "./capabilities";
import { type TransitionTicketOptions, transitionTicket } from "./lifecycle";
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

test("claim lifecycle outcomes match the shared capability for every actor and Ticket status", async () => {
  const statuses = ["pending", "in_progress", "completed", "closed", "cancelled"] as const;
  const cases = [
    {
      actor: { type: "admin", userId: "admin-1" },
      viewer: { role: "admin", userId: "admin-1" },
    },
    {
      actor: { type: "technician", userId: "technician-1" },
      viewer: { role: "technician", userId: "technician-1" },
    },
    {
      actor: { type: "technician", userId: "technician-2" },
      viewer: { role: "technician", userId: "technician-2" },
    },
    {
      actor: { type: "system" },
      viewer: { role: null, userId: null },
    },
    {
      actor: { type: "user", userId: "user-1" },
      viewer: { role: null, userId: "user-1" },
    },
  ] as const;

  for (const status of statuses) {
    for (const { actor, viewer } of cases) {
      let rpcCalled = false;
      const supabase = {
        from: () => ({
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: {
                  id: "ticket-1",
                  status,
                  assigned_to: "technician-1",
                  reporter_email: "reporter@example.com",
                },
                error: null,
              }),
            }),
          }),
        }),
        rpc: async () => {
          rpcCalled = true;
          return { data: true, error: null };
        },
      } as unknown as SupabaseClient<Database>;
      const decision = getTicketTransitionCapability({ status, assignedTo: "technician-1" }, viewer, "claim");

      const result = await transitionTicket(supabase, {
        ticketId: "ticket-1",
        actor,
        transition: "claim",
        skipRevalidation: true,
      });

      assert.equal(result.success, decision.enabled);
      assert.equal(rpcCalled, decision.enabled);
      if (!decision.enabled && !result.success) {
        assert.equal(result.error, decision.transitionError);
        assert.equal(result.code, decision.errorCode);
      }
    }
  }
});

test("Admin lifecycle outcomes match shared capabilities for every actor and Ticket status", async () => {
  const statuses = ["pending", "in_progress", "completed", "closed", "cancelled"] as const;
  const transitions = [
    {
      action: "assign" as const,
      payload: { transition: "assign" as const, technicianId: "technician-1" },
    },
    {
      action: "cancel" as const,
      payload: { transition: "cancel" as const, reason: "重複報修" },
    },
    {
      action: "returnToPending" as const,
      payload: { transition: "return_to_pending" as const },
    },
  ];
  const cases = [
    {
      actor: { type: "admin", userId: "admin-1" },
      viewer: { role: "admin", userId: "admin-1" },
    },
    {
      actor: { type: "technician", userId: "technician-1" },
      viewer: { role: "technician", userId: "technician-1" },
    },
    {
      actor: { type: "technician", userId: "technician-2" },
      viewer: { role: "technician", userId: "technician-2" },
    },
    {
      actor: { type: "system" },
      viewer: { role: null, userId: null },
    },
    {
      actor: { type: "user", userId: "user-1" },
      viewer: { role: null, userId: "user-1" },
    },
  ] as const;

  for (const { action, payload } of transitions) {
    for (const status of statuses) {
      for (const { actor, viewer } of cases) {
        let mutationCalled = false;
        const supabase = {
          from: (table: string) => ({
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data:
                    table === "tickets"
                      ? {
                          id: "ticket-1",
                          status,
                          assigned_to: "technician-1",
                          reporter_email: "reporter@example.com",
                        }
                      : { id: "technician-1", user_role: "technician", display_name: "技師" },
                  error: null,
                }),
              }),
            }),
            update: () => {
              mutationCalled = true;
              return { eq: () => ({ eq: async () => ({ error: null }) }) };
            },
            insert: async () => ({ error: null }),
          }),
        } as unknown as SupabaseClient<Database>;
        const decision = getTicketTransitionCapability({ status, assignedTo: "technician-1" }, viewer, action);

        const result = await transitionTicket(supabase, {
          ticketId: "ticket-1",
          actor,
          skipRevalidation: true,
          ...payload,
        } as TransitionTicketOptions);

        assert.equal(result.success, decision.enabled);
        assert.equal(mutationCalled, decision.enabled);
        if (!decision.enabled && !result.success) {
          assert.equal(result.error, decision.transitionError);
          assert.equal(result.code, decision.errorCode);
        }
      }
    }
  }
});
