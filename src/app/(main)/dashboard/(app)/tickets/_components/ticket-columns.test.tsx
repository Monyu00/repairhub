import { renderToStaticMarkup } from "react-dom/server";

import { getTicketColumns } from "./ticket-columns";
import assert from "node:assert/strict";
import test from "node:test";

test("Ticket ID link exposes a single focus target with the shared focus ring", async () => {
  const id = "00000000-0000-4000-8000-000000000001";
  const idColumn = getTicketColumns(false)[0];

  assert.ok(typeof idColumn.cell === "function");

  const node = await idColumn.cell({
    row: {
      getValue: () => id,
      original: { id },
    },
  } as never);
  const html = renderToStaticMarkup(node);

  assert.equal((html.match(/<a\b/g) ?? []).length, 1);
  assert.match(html, /focus-visible:ring-2 focus-visible:ring-ring/);
});
