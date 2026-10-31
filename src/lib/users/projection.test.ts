import { compareUserProjection, resolveUserProjection, type UserProjection } from "./projection";
import assert from "node:assert/strict";
import test from "node:test";

function projection(overrides: Partial<UserProjection> = {}): UserProjection {
  return {
    id: "user",
    email: "user@example.com",
    displayName: null,
    role: null,
    department: null,
    phone: null,
    avatarUrl: null,
    isActive: true,
    ...overrides,
  };
}

test("uses profile values over auth metadata", () => {
  const result = resolveUserProjection(
    {
      id: "user-1",
      email: "profile@example.com",
      user_metadata: {
        full_name: "Metadata Name",
        name: "Other Name",
        display_name: "Display Name",
        department: "Metadata Department",
        phone: "0987654321",
        avatar_url: "https://example.com/avatar.png",
      },
    },
    {
      display_name: "Profile Name",
      department: "Profile Department",
      phone: "0912345678",
      user_role: "admin",
      is_active: true,
    },
  );

  assert.deepEqual(result, {
    id: "user-1",
    email: "profile@example.com",
    displayName: "Profile Name",
    role: "admin",
    department: "Profile Department",
    phone: "0912345678",
    avatarUrl: "https://example.com/avatar.png",
    isActive: true,
  });
});

test("falls back to auth metadata when profile values are missing", () => {
  const result = resolveUserProjection(
    {
      id: "user-2",
      email: null,
      user_metadata: {
        full_name: "Metadata Name",
        name: "Other Name",
        display_name: "Display Name",
        department: "Metadata Department",
        phone: "0987654321",
        avatar_url: "https://example.com/avatar.png",
      },
    },
    null,
  );

  assert.deepEqual(result, {
    id: "user-2",
    email: "",
    displayName: "Metadata Name",
    role: null,
    department: "Metadata Department",
    phone: "0987654321",
    avatarUrl: "https://example.com/avatar.png",
    isActive: true,
  });
});

test("uses the first non-empty auth metadata display name", () => {
  const result = resolveUserProjection(
    {
      id: "user-5",
      email: "fallback@example.com",
      user_metadata: { full_name: "", name: "Metadata Name", display_name: "Display Name" },
    },
    null,
  );

  assert.equal(result.displayName, "Metadata Name");
});

test("uses auth metadata display_name as the third name fallback", () => {
  const result = resolveUserProjection(
    {
      id: "user-6",
      email: "third-fallback@example.com",
      user_metadata: { full_name: "", name: "", display_name: "Display Name" },
    },
    null,
  );

  assert.equal(result.displayName, "Display Name");
});
test("falls back to the auth metadata role when the profile role is missing", () => {
  const result = resolveUserProjection(
    {
      id: "user-3",
      email: "role@example.com",
      user_metadata: { user_role: "technician" },
    },
    { user_role: null },
  );

  assert.equal(result.role, "technician");
});

test("uses the profile active state when present", () => {
  const result = resolveUserProjection({ id: "user-4", email: "inactive@example.com" }, { is_active: false });

  assert.equal(result.isActive, false);
});

test("sorts active users first, then by role precedence and email", () => {
  const active = projection({ email: "active@example.com", role: "technician" });
  const inactiveAdmin = projection({ id: "inactive", email: "inactive@example.com", role: "admin", isActive: false });
  const admin = projection({ id: "admin", email: "admin@example.com", role: "admin" });
  const technician = projection({ id: "technician", email: "technician@example.com", role: "technician" });
  const unassigned = projection({ id: "unassigned", email: "unassigned@example.com" });
  const earlierEmail = projection({ id: "earlier", email: "a@example.com", role: "admin" });

  assert.ok(compareUserProjection(active, inactiveAdmin) < 0);
  assert.ok(compareUserProjection(admin, technician) < 0);
  assert.ok(compareUserProjection(technician, unassigned) < 0);
  assert.ok(compareUserProjection(earlierEmail, admin) < 0);
});
