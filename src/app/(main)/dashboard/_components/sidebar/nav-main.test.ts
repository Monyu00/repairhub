import { sidebarItems } from "@/navigation/sidebar/sidebar-items";

import { filterNavGroups } from "./nav-main";
import assert from "node:assert/strict";
import test from "node:test";

function visibleItemIds(groups: ReturnType<typeof filterNavGroups>): string[] {
  return groups.flatMap((group) => group.items.map((item) => item.id));
}

test("keeps admin-only groups for an admin role", () => {
  const itemIds = visibleItemIds(filterNavGroups(sidebarItems, "admin"));

  assert.ok(itemIds.includes("reports"));
  assert.ok(itemIds.includes("settings"));
});

test("hides admin-only groups from a technician role", () => {
  const itemIds = visibleItemIds(filterNavGroups(sidebarItems, "technician"));

  assert.ok(itemIds.includes("tickets"));
  assert.ok(!itemIds.includes("reports"));
});

test("degrades to unprotected groups when the role is missing", () => {
  const groups = filterNavGroups(sidebarItems, null);

  assert.deepEqual(
    groups.map((group) => group.id),
    [0],
  );
});
