"use client";

import { useState } from "react";

import Link from "next/link";

import { ArrowRight, CircleSlash2 } from "lucide-react";

import { getTicketStatusPresentation } from "@/components/tickets/ticket-status";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import type { TicketStatus } from "@/server/tickets/lifecycle";

import type { CampusBuildingStat } from "./report-types";

interface CampusMapZone {
  code: string;
  height: number;
  width: number;
  x: number;
  y: number;
}

const MAP_ZONES: CampusMapZone[] = [
  { code: "A", x: 32, y: 15, width: 7, height: 6 },
  { code: "B", x: 35, y: 25, width: 7, height: 6 },
  { code: "C", x: 35, y: 39, width: 7, height: 6 },
  { code: "D", x: 31, y: 50, width: 6, height: 6 },
  { code: "E", x: 39, y: 51, width: 7, height: 6 },
  { code: "F", x: 79, y: 58, width: 7, height: 6 },
  { code: "G", x: 57, y: 40, width: 7, height: 6 },
  { code: "H1", x: 48, y: 83, width: 7, height: 6 },
  { code: "H2", x: 82, y: 78, width: 7, height: 6 },
  { code: "H3", x: 26, y: 65, width: 7, height: 6 },
  { code: "H5", x: 11, y: 67, width: 7, height: 6 },
  { code: "H6", x: 38, y: 82, width: 7, height: 7 },
  { code: "I", x: 22, y: 13, width: 6, height: 6 },
  { code: "J", x: 22, y: 25, width: 6, height: 6 },
  { code: "K", x: 47, y: 16, width: 8, height: 7 },
  { code: "L", x: 53, y: 27, width: 7, height: 6 },
  { code: "M", x: 47, y: 66, width: 7, height: 6 },
  { code: "N", x: 70, y: 35, width: 8, height: 6 },
  { code: "O", x: 79, y: 37, width: 7, height: 5 },
  { code: "P", x: 71, y: 18, width: 6, height: 5 },
  { code: "Q", x: 56, y: 6, width: 6, height: 5 },
  { code: "R", x: 64, y: 7, width: 7, height: 5 },
  { code: "S", x: 17, y: 42, width: 7, height: 7 },
  { code: "T", x: 83, y: 29, width: 6, height: 6 },
  { code: "U", x: 58, y: 61, width: 7, height: 6 },
  { code: "V", x: 62, y: 28, width: 7, height: 5 },
  { code: "W", x: 91, y: 28, width: 6, height: 6 },
  { code: "X", x: 67, y: 52, width: 6, height: 6 },
  { code: "Y", x: 72, y: 50, width: 7, height: 6 },
  { code: "Z", x: 80, y: 68, width: 6, height: 6 },
];

const STATIC_MAP_LABELS = [
  { label: "水資源回收中心", x: 10, y: 7 },
  { label: "大型加工坊", x: 74, y: 10 },
  { label: "第一停車場", x: 61, y: 12 },
  { label: "第二停車場", x: 53, y: 24 },
  { label: "第三停車場", x: 43, y: 34 },
  { label: "集會場", x: 48, y: 48 },
  { label: "在水一方", x: 45, y: 57 },
  { label: "天圓地方", x: 53, y: 60 },
  { label: "排球場", x: 68, y: 62 },
  { label: "網球場", x: 87, y: 58 },
  { label: "操場", x: 35, y: 88 },
  { label: "游泳池／冰場", x: 40, y: 96 },
  { label: "幼稚園戶外場所", x: 25, y: 98 },
  { label: "中正南路", x: 47, y: 3 },
  { label: "正南一街", x: 96, y: 50 },
  { label: "中華路", x: 47, y: 99 },
  { label: "南台街", x: 4, y: 50 },
];

const STATUS_ORDER: TicketStatus[] = ["pending", "in_progress", "completed", "closed", "cancelled"];

interface CampusMapViewProps {
  buildings: CampusBuildingStat[];
  onSelect: (buildingCode: string) => void;
  selectedCode: string;
}

interface CampusMapProps {
  buildings: CampusBuildingStat[];
}

function getZoneLabel(building: CampusBuildingStat | undefined, code: string) {
  return building?.buildingName ?? code;
}

function formatTicketDate(iso: string) {
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? iso
    : date.toLocaleDateString("zh-TW", {
        month: "2-digit",
        day: "2-digit",
      });
}

export function CampusMapView({ buildings, onSelect, selectedCode }: CampusMapViewProps) {
  const buildingsByCode = new Map(buildings.map((building) => [building.buildingCode, building]));
  const selectedBuilding = buildingsByCode.get(selectedCode);
  const selectedCounts = selectedBuilding?.statusCounts;
  const selectedTotal = selectedCounts?.total ?? 0;
  const recentTickets = selectedBuilding?.recentTickets ?? [];

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.7fr)_minmax(280px,1fr)]">
      <Card className="overflow-hidden shadow-xs">
        <CardHeader className="border-border/50 border-b pb-3">
          <CardTitle>校園工單分佈</CardTitle>
        </CardHeader>
        <CardContent className="p-3 sm:p-4">
          <div className="relative h-[480px] w-full overflow-hidden rounded-lg border border-border/70 bg-muted/20 sm:h-[540px]">
            <svg
              aria-hidden="true"
              className="absolute inset-0 size-full"
              preserveAspectRatio="none"
              viewBox="0 0 1000 650"
            >
              <path
                d="M70 90 L570 25 L945 120 L965 570 L720 625 L80 600 Z"
                fill="var(--muted)"
                fillOpacity="0.32"
                stroke="var(--border)"
                strokeWidth="3"
              />
              <path d="M75 310 C280 270 490 315 955 245" fill="none" stroke="var(--border)" strokeWidth="12" />
              <path d="M95 525 C320 455 560 535 955 425" fill="none" stroke="var(--border)" strokeWidth="10" />
              <path d="M470 60 C485 220 455 435 510 620" fill="none" stroke="var(--border)" strokeWidth="8" />
              <rect x="285" y="135" width="100" height="70" rx="8" fill="var(--primary)" fillOpacity="0.08" />
              <rect x="435" y="185" width="105" height="80" rx="8" fill="var(--primary)" fillOpacity="0.06" />
              <rect x="275" y="345" width="125" height="105" rx="8" fill="var(--accent)" fillOpacity="0.38" />
              <rect x="625" y="420" width="120" height="92" rx="8" fill="var(--accent)" fillOpacity="0.34" />
              <rect x="380" y="535" width="230" height="80" rx="10" fill="var(--primary)" fillOpacity="0.07" />
            </svg>

            {STATIC_MAP_LABELS.map((label) => (
              <span
                key={label.label}
                className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-1/2 text-center font-medium text-[9px] text-muted-foreground sm:text-[10px]"
                style={{ left: `${label.x}%`, top: `${label.y}%` }}
              >
                {label.label}
              </span>
            ))}

            {MAP_ZONES.map((zone) => {
              const building = buildingsByCode.get(zone.code);
              const total = building?.statusCounts.total ?? 0;
              const isSelected = zone.code === selectedCode;
              const zoneLabel = getZoneLabel(building, zone.code);

              return (
                <button
                  aria-label={`${zoneLabel} (${zone.code})，期間工單 ${total} 件${isSelected ? "，已選取" : ""}`}
                  aria-pressed={isSelected}
                  className={cn(
                    "absolute z-20 flex min-h-7 min-w-7 items-center justify-center rounded-md border px-1.5 font-semibold text-[10px] tabular-nums transition-colors sm:min-h-8 sm:min-w-8 sm:text-xs",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                    total > 0
                      ? "border-primary/50 bg-primary/10 text-primary hover:bg-primary/20"
                      : "border-border bg-card text-muted-foreground hover:bg-muted",
                    isSelected && "border-primary bg-primary text-primary-foreground hover:bg-primary",
                  )}
                  data-map-code={zone.code}
                  key={zone.code}
                  onClick={() => onSelect(zone.code)}
                  style={{
                    height: `${zone.height}%`,
                    left: `${zone.x}%`,
                    top: `${zone.y}%`,
                    width: `${zone.width}%`,
                  }}
                  type="button"
                >
                  {zone.code}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-xs">
        <CardHeader className="border-border/50 border-b pb-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <CardTitle className="truncate">
                {selectedBuilding?.buildingName ?? (selectedCode || "尚未選取地點")}
              </CardTitle>
              <CardDescription>{selectedCode || "—"}</CardDescription>
            </div>
            <Badge variant="outline">{selectedTotal} 件</Badge>
          </div>
        </CardHeader>
        <CardContent aria-live="polite" className="pt-4">
          {selectedTotal === 0 ? (
            <Empty className="min-h-40 border-0 p-2">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <CircleSlash2 />
                </EmptyMedia>
                <EmptyTitle>此期間沒有工單</EmptyTitle>
                <EmptyDescription>選取其他地點查看狀態統計</EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                {STATUS_ORDER.map((status) => {
                  const presentation = getTicketStatusPresentation(status);
                  return (
                    <div
                      className="flex items-center justify-between gap-3 rounded-md bg-muted/40 px-3 py-2"
                      key={status}
                    >
                      <Badge variant={presentation.badgeVariant}>{presentation.label}</Badge>
                      <span className="font-semibold text-foreground text-sm tabular-nums">
                        {selectedCounts?.[status] ?? 0}
                      </span>
                    </div>
                  );
                })}
              </div>

              <Separator />

              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-medium text-sm">近期工單</h3>
                  {selectedBuilding ? (
                    <Button asChild size="xs" variant="outline">
                      <Link href={`/dashboard/tickets?building=${encodeURIComponent(selectedBuilding.buildingId)}`}>
                        查看報修單
                        <ArrowRight data-icon="inline-end" />
                      </Link>
                    </Button>
                  ) : null}
                </div>

                {recentTickets.length === 0 ? (
                  <p className="text-muted-foreground text-xs">此期間沒有近期工單</p>
                ) : (
                  <ul className="flex flex-col gap-2">
                    {recentTickets.map((ticket) => {
                      const presentation = getTicketStatusPresentation(ticket.status);
                      return (
                        <li className="flex flex-col gap-1.5 rounded-md border border-border/60 p-2.5" key={ticket.id}>
                          <div className="flex items-center justify-between gap-2">
                            <Badge variant={presentation.badgeVariant}>{presentation.label}</Badge>
                            <time className="text-muted-foreground text-xs" dateTime={ticket.createdAt}>
                              {formatTicketDate(ticket.createdAt)}
                            </time>
                          </div>
                          <p className="line-clamp-2 text-sm">{ticket.description}</p>
                          {ticket.ticketNumber ? (
                            <p className="text-muted-foreground text-xs">#{ticket.ticketNumber}</p>
                          ) : null}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export function CampusMap({ buildings }: CampusMapProps) {
  const [selectedCode, setSelectedCode] = useState(
    () =>
      buildings.find((building) => building.statusCounts.total > 0)?.buildingCode ?? buildings[0]?.buildingCode ?? "",
  );

  return <CampusMapView buildings={buildings} onSelect={setSelectedCode} selectedCode={selectedCode} />;
}
