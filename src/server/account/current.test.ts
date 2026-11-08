import { readCurrentAccount } from "./current";
import assert from "node:assert/strict";
import test from "node:test";

test("uses profile values and resolves notification preferences", async () => {
  const account = await readCurrentAccount({
    async readCurrent() {
      return {
        user: { id: "user-1", email: "user@example.com", user_metadata: { full_name: "Metadata Name" } },
        profile: {
          display_name: "Profile Name",
          user_role: "technician",
          notification_preferences: { new_ticket: false },
        },
      };
    },
  });

  assert.deepEqual(account, {
    id: "user-1",
    email: "user@example.com",
    displayName: "Profile Name",
    role: "technician",
    department: null,
    phone: null,
    avatarUrl: null,
    isActive: true,
    mustChangePassword: false,
    notificationPreferences: { ticketStatus: true, newTicket: false },
  });
});

test("treats a missing profile as no valid Account", async () => {
  const account = await readCurrentAccount({
    async readCurrent() {
      return { user: { id: "user-1", email: "user@example.com" }, profile: null };
    },
  });

  assert.equal(account, null);
});

test("surfaces profile read errors", async () => {
  await assert.rejects(
    readCurrentAccount({
      async readCurrent() {
        throw new Error("profile read failed");
      },
    }),
    /profile read failed/u,
  );
});
