import { sortSpacesByOrder } from "./locations";
import assert from "node:assert/strict";
import test from "node:test";

test("sorts spaces by persisted order before floor and name fallbacks", () => {
  const spaces = [
    { id: "name-first", floor: 1, name: "A", sort_order: 2 },
    { id: "sort-first", floor: 3, name: "Z", sort_order: 1 },
    { id: "floor-first", floor: 1, name: "B", sort_order: 2 },
  ];

  assert.deepEqual(
    sortSpacesByOrder(spaces).map((space) => space.id),
    ["sort-first", "name-first", "floor-first"],
  );
  assert.deepEqual(
    spaces.map((space) => space.id),
    ["name-first", "sort-first", "floor-first"],
  );
});
