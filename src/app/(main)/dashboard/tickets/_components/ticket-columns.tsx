"use client";

import Link from "next/link";

import { type ColumnDef, columnVisibilityFeature, tableFeatures } from "@tanstack/react-table";
import { Mail, Phone, User } from "lucide-react";

import { TicketStatusBadge } from "@/components/tickets/ticket-status-badge";
import { formatTicketDate } from "@/lib/formatters";

import type { TicketRecord } from "./ticket-types";

export const ticketTableFeatures = tableFeatures({
  columnVisibilityFeature,
});

export function getTicketColumns(canViewReporter: boolean): ColumnDef<typeof ticketTableFeatures, TicketRecord>[] {
  const columns: ColumnDef<typeof ticketTableFeatures, TicketRecord>[] = [
    {
      accessorKey: "id",
      header: "Ticket ID",
      cell: ({ row }) => {
        const id = row.getValue("id") as string;
        return (
          <Link
            href={`/dashboard/tickets/${row.original.id}`}
            aria-label={`查看報修單 ${id.slice(0, 8)}`}
            className="font-mono font-semibold text-primary text-xs relative z-10"
          >
            #{id.slice(0, 8)}
          </Link>
        );
      },
    },
    {
      accessorKey: "status",
      header: "狀態",
      cell: ({ row }) => {
        return <TicketStatusBadge status={row.original.status} />;
      },
    },
    {
      accessorKey: "location",
      header: "地點",
      cell: ({ row }) => {
        const building = row.original.building;
        const space = row.original.space;
        return (
          <div className="flex flex-col text-xs min-w-0">
            <span className="font-medium text-foreground">
              {building.name} ({building.code})
            </span>
            {space && (
              <span className="text-muted-foreground">
                {space.name} ({space.floor}F)
              </span>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "category",
      header: "類別",
      cell: ({ row }) => {
        return <span className="font-medium text-foreground text-xs">{row.original.category.name}</span>;
      },
    },
    {
      accessorKey: "description",
      header: "故障描述",
      cell: ({ row }) => {
        return (
          <span className="line-clamp-1 max-w-[240px] text-muted-foreground text-xs">{row.original.description}</span>
        );
      },
    },
  ];

  if (canViewReporter) {
    columns.push({
      accessorKey: "reporter",
      header: "通報人聯絡資訊",
      cell: ({ row }) => {
        const name = row.original.reporterName;
        const dept = row.original.reporterDepartment;
        const email = row.original.reporterEmail;
        const phone = row.original.reporterPhone;
        return (
          <div className="flex flex-col gap-0.5 text-xs min-w-0">
            {(name || dept) && (
              <span className="flex items-center gap-1 font-medium text-foreground">
                <User className="size-3 text-muted-foreground" />
                {name || dept}
                {name && dept && <span className="font-normal text-muted-foreground">（{dept}）</span>}
              </span>
            )}
            {email && (
              <span className="flex items-center gap-1 text-muted-foreground">
                <Mail className="size-3" />
                {email}
              </span>
            )}
            {phone && (
              <span className="flex items-center gap-1 text-muted-foreground">
                <Phone className="size-3" />
                {phone}
              </span>
            )}
            {!name && !dept && !email && !phone && <span className="text-muted-foreground italic">-</span>}
          </div>
        );
      },
    });
  }

  columns.push({
    accessorKey: "createdAt",
    header: ({ column }) => {
      return "通報時間";
    },
    cell: ({ row }) => {
      const dateStr = row.getValue("createdAt") as string;
      const formattedDate = formatTicketDate(dateStr);
      return <span className="whitespace-nowrap text-muted-foreground text-xs">{formattedDate}</span>;
    },
  });

  return columns;
}
