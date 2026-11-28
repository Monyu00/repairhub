import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/database.types";
import type { AuthenticatedUser } from "@/server/auth";

import { getTicketTransitionCapability } from "./capabilities";
import { actorFromAuthUser, type TransitionTicketOptions, transitionTicket } from "./lifecycle";
import assert from "node:assert/strict";
import test from "node:test";

const statuses = ["pending", "in_progress", "completed", "closed", "cancelled"] as const;
const transitionCases = [
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

test("actorFromAuthUser keeps a missing role unprivileged", () => {
  const actor = actorFromAuthUser({ role: null, userId: "user-1", displayName: null } as AuthenticatedUser);

  assert.deepEqual(actor, { type: "user", userId: "user-1", displayName: undefined });
});

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
  for (const status of statuses) {
    for (const { actor, viewer } of transitionCases) {
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
  for (const { action, payload } of transitions) {
    for (const status of statuses) {
      for (const { actor, viewer } of transitionCases) {
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

test("Completion lifecycle preserves capability errors before photo validation", async () => {
  for (const status of statuses) {
    for (const { actor, viewer } of transitionCases) {
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
      } as unknown as SupabaseClient<Database>;
      const decision = getTicketTransitionCapability({ status, assignedTo: "technician-1" }, viewer, "closure");

      const result = await transitionTicket(supabase, {
        ticketId: "ticket-1",
        actor,
        transition: "submit_closure",
        photosBase64: [],
        skipRevalidation: true,
      });

      assert.equal(result.success, false);
      if (decision.enabled) {
        assert.deepEqual(result, {
          success: false,
          error: "結案需至少上傳 1 張完工證明照片",
          code: "VALIDATION_FAILED",
        });
      } else if (!result.success) {
        assert.equal(result.error, decision.transitionError);
        assert.equal(result.code, decision.errorCode);
      }
    }
  }
});

test("Permitted completion stores photos and preserves the mutation and note contract", async () => {
  const state = {
    uploads: [] as Array<{ bucket: string; path: string }>,
    photoInserts: [] as Array<Record<string, unknown>>,
    ticketUpdates: [] as Array<{ payload: Record<string, unknown>; filters: Array<[string, string]> }>,
    noteInserts: [] as Array<Record<string, unknown>>,
  };
  const supabase = {
    from: (table: string) => {
      if (table === "tickets") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: {
                  id: "ticket-1",
                  status: "in_progress",
                  assigned_to: "technician-1",
                  reporter_email: "reporter@example.com",
                },
                error: null,
              }),
            }),
          }),
          update: (payload: Record<string, unknown>) => ({
            eq: (idColumn: string, id: string) => ({
              eq: async (statusColumn: string, status: string) => {
                state.ticketUpdates.push({
                  payload,
                  filters: [
                    [idColumn, id],
                    [statusColumn, status],
                  ],
                });
                return { error: null };
              },
            }),
          }),
        };
      }
      if (table === "ticket_photos") {
        return {
          insert: async (payload: Record<string, unknown>) => {
            state.photoInserts.push(payload);
            return { error: null };
          },
        };
      }
      if (table === "ticket_notes") {
        return {
          insert: async (payload: Record<string, unknown>) => {
            state.noteInserts.push(payload);
            return { error: null };
          },
        };
      }
      throw new Error(`Unexpected table: ${table}`);
    },
    storage: {
      from: (bucket: string) => ({
        upload: async (path: string) => {
          state.uploads.push({ bucket, path });
          return { error: null };
        },
      }),
    },
  } as unknown as SupabaseClient<Database>;
  const result = await transitionTicket(supabase, {
    ticketId: "ticket-1",
    actor: { type: "technician", userId: "technician-1" },
    transition: "submit_closure",
    summary: "  已更換燈管  ",
    photosBase64: ["aGk="],
    skipRevalidation: true,
  });

  assert.deepEqual(result, {
    success: true,
    data: {
      ticketId: "ticket-1",
      previousStatus: "in_progress",
      newStatus: "completed",
      assignedTo: "technician-1",
    },
  });
  assert.equal(state.uploads.length, 1);
  assert.equal(state.uploads[0].bucket, "ticket-photos");
  assert.match(state.uploads[0].path, /^closure\/ticket-1\//);
  assert.deepEqual(state.photoInserts, [
    { ticket_id: "ticket-1", storage_path: state.uploads[0].path, phase: "closure" },
  ]);
  assert.deepEqual(state.ticketUpdates, [
    {
      payload: { status: "completed" },
      filters: [
        ["id", "ticket-1"],
        ["status", "in_progress"],
      ],
    },
  ]);
  assert.deepEqual(state.noteInserts, [
    {
      ticket_id: "ticket-1",
      author_id: "technician-1",
      content: "已提交完工結案：已更換燈管",
      type: "status_change",
    },
  ]);
});
