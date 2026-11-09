import { renderToStaticMarkup } from "react-dom/server";

import type { TicketRecord } from "@/server/tickets/query";

import { PendingTicketCard } from "./pending-ticket-card";
import assert from "node:assert/strict";
import test from "node:test";

const ticket: TicketRecord = {
  id: "00000000-0000-4000-8000-000000000001",
  status: "pending",
  categoryId: "00000000-0000-4000-8000-000000000002",
  category: { id: "00000000-0000-4000-8000-000000000002", name: "水電" },
  buildingId: "00000000-0000-4000-8000-000000000003",
  building: { id: "00000000-0000-4000-8000-000000000003", name: "行政大樓", code: "ADM" },
  spaceId: null,
  space: null,
  description: "走廊燈具閃爍",
  equipmentId: null,
  equipmentName: null,
  reporterName: null,
  reporterDepartment: null,
  reporterEmail: null,
  reporterPhone: null,
  assignedTo: null,
  assignedTechnician: null,
  technicianName: null,
  rating: null,
  ratedAt: null,
  createdAt: "2026-11-04T12:00:00.000Z",
  updatedAt: "2026-11-04T12:00:00.000Z",
};

test("pending Ticket card keeps detail navigation separate from Claim", () => {
  const html = renderToStaticMarkup(
    <PendingTicketCard ticket={ticket} canViewReporter={false} onClaim={async () => undefined} />,
  );

  assert.equal((html.match(/<a\b/g) ?? []).length, 1);
  assert.equal((html.match(/<button\b/g) ?? []).length, 1);
  assert.match(html, /href="\/dashboard\/tickets\/00000000-0000-4000-8000-000000000001"/);
  assert.match(html, /立即接單/);
  assert.doesNotMatch(html, /role="button"/);
  assert.doesNotMatch(html, /tabindex="0"/i);
});
