import { isValidElement, type ReactElement, type ReactNode } from "react";

import type { TicketRecord } from "@/server/tickets/query";

import { PublicTicketList } from "./public-ticket-list";
import assert from "node:assert/strict";
import test from "node:test";

interface TrackLinkProps {
  href?: unknown;
  prefetch?: unknown;
  children?: ReactNode;
}

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

function collectTrackLinks(node: ReactNode): ReactElement<TrackLinkProps>[] {
  if (Array.isArray(node)) {
    return node.flatMap(collectTrackLinks);
  }

  if (!isValidElement<TrackLinkProps>(node)) {
    return [];
  }

  const links = typeof node.props.href === "string" && node.props.href.startsWith("/track/") ? [node] : [];
  return [...links, ...collectTrackLinks(node.props.children)];
}

test("public Ticket rows disable prefetch for every Ticket Detail link", () => {
  const links = collectTrackLinks(
    PublicTicketList({
      tickets: [ticket],
      currentPage: 1,
      totalPages: 1,
      totalCount: 1,
      pageSize: 15,
    }),
  );

  assert.equal(links.length, 3);
  assert.deepEqual(
    links.map((link) => link.props.prefetch),
    [false, false, false],
  );
});
