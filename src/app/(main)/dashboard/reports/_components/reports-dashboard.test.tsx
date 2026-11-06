import { isValidElement, type ReactElement, type ReactNode } from "react";

import { renderToStaticMarkup } from "react-dom/server";

import { CampusMap, CampusMapView } from "./campus-map";
import type { CampusBuildingStat, ReportData } from "./report-types";
import { ReportsDashboard } from "./reports-dashboard";
import assert from "node:assert/strict";
import test from "node:test";

function makeCampusBuilding(code: string, total: number): CampusBuildingStat {
  return {
    buildingId: `building-${code}`,
    buildingCode: code,
    buildingName: `${code} 棟`,
    statusCounts: {
      pending: total > 0 ? 1 : 0,
      in_progress: total > 1 ? 1 : 0,
      completed: total > 2 ? 1 : 0,
      closed: total > 3 ? 1 : 0,
      cancelled: total > 4 ? 1 : 0,
      total,
    },
    recentTickets:
      total > 0
        ? [
            {
              id: `ticket-${code}`,
              ticketNumber: `T-${code}`,
              description: `${code} 棟近期工單`,
              status: "pending",
              createdAt: "2026-11-04T12:00:00.000Z",
            },
          ]
        : [],
  };
}

function makeReportData(campusBuildings: CampusBuildingStat[]): ReportData {
  return {
    kpi: {
      totalTickets: 1,
      completedOrClosedCount: 0,
      pendingCount: 1,
      inProgressCount: 0,
      completionRate: 0,
      overallAvgDaysToResolve: 0,
      activePeriodLabel: "過去 1 年",
    },
    monthlyTrends: [],
    buildingDistribution: [],
    campusBuildings,
    categoryDistribution: [],
    resolutionTrends: [],
    technicianPerformance: [],
    satisfaction: {
      avgRating: 0,
      totalRated: 0,
      totalClosed: 0,
      responseRate: 0,
      distribution: [],
      monthlyTrends: [],
      technicianRankings: [],
    },
    filter: { preset: "1y" },
  };
}

function findCampusMap(node: ReactNode): ReactElement<{ buildings: CampusBuildingStat[] }> | null {
  if (Array.isArray(node)) {
    for (const child of node) {
      const match = findCampusMap(child);
      if (match) return match;
    }
    return null;
  }

  if (!isValidElement(node)) return null;
  if (node.type === CampusMap) return node as ReactElement<{ buildings: CampusBuildingStat[] }>;

  return findCampusMap((node.props as { children?: ReactNode }).children);
}

test("ReportsDashboard injects campus Building data into the map", () => {
  const buildings = [makeCampusBuilding("A", 2), makeCampusBuilding("B", 0)];
  const map = findCampusMap(ReportsDashboard({ initialData: makeReportData(buildings) }));

  assert.ok(map);
  assert.deepEqual(map.props.buildings, buildings);
});

test("CampusMapView renders every map code with accessible selected state", () => {
  const buildings = [makeCampusBuilding("A", 5), makeCampusBuilding("B", 0)];
  const markup = renderToStaticMarkup(
    <CampusMapView buildings={buildings} onSelect={() => undefined} selectedCode="A" />,
  );

  assert.equal((markup.match(/data-map-code="/g) ?? []).length, 30);
  assert.match(markup, /aria-label="A 棟 \(A\)，期間工單 5 件，已選取"/);
  assert.match(markup, /aria-pressed="true"/);
  assert.match(markup, /待處理/);
  assert.match(markup, /已取消/);
  assert.match(markup, /A 棟近期工單/);
  assert.match(markup, /href="\/dashboard\/tickets\?building=building-A"/);
});

test("CampusMapView shows a distinct empty state for a zero-count Building", () => {
  const markup = renderToStaticMarkup(
    <CampusMapView buildings={[makeCampusBuilding("B", 0)]} onSelect={() => undefined} selectedCode="B" />,
  );

  assert.match(markup, /此期間沒有工單/);
  assert.match(markup, /0 件/);
});

test("CampusMapView shows an empty state when a Building has no recent Tickets", () => {
  const building = makeCampusBuilding("A", 5);
  building.recentTickets = [];

  const markup = renderToStaticMarkup(
    <CampusMapView buildings={[building]} onSelect={() => undefined} selectedCode="A" />,
  );

  assert.match(markup, /此期間沒有近期工單/);
});
