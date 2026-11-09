import { renderToStaticMarkup } from "react-dom/server";

import type { TicketRecord } from "@/server/tickets/query";

import { RepairRecordTableRow } from "./repair-records-content";
import assert from "node:assert/strict";
import test from "node:test";

const record: TicketRecord = {
  id: "00000000-0000-4000-8000-000000000001",
  status: "completed",
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

test("Repair Record table row uses a stretched link without row focus", () => {
  const html = renderToStaticMarkup(
    <table>
      <tbody>
        <RepairRecordTableRow
          record={record}
          isAdmin={false}
          href="/dashboard/tickets/00000000-0000-4000-8000-000000000001?returnTo=%2Fdashboard%2Frepair-records"
        />
      </tbody>
    </table>,
  );

  assert.match(
    html,
    /href="\/dashboard\/tickets\/00000000-0000-4000-8000-000000000001\?returnTo=%2Fdashboard%2Frepair-records"/,
  );
  assert.doesNotMatch(html, /tabindex="0"/i);
  assert.doesNotMatch(html, /role="button"/);
});
