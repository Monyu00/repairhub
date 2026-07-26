"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { zhTW } from "date-fns/locale/zh-TW";
import { ArrowUpDown, Mail, Phone } from "lucide-react";

import { Button } from "@/components/ui/button";

import { TicketStatusBadge } from "./ticket-status-badge";
import type { TicketRow } from "./ticket-types";

export function getTicketColumns(canViewReporter: boolean): ColumnDef<TicketRow>[] {
  const columns: ColumnDef<TicketRow>[] = [
    {
      accessorKey: "id",
      header: "Ticket ID",
      cell: ({ row }) => {
        const id = row.getValue("id") as string;
        return <span className="font-mono text-xs font-semibold text-primary">#{id.slice(0, 8)}</span>;
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
      accessorKey: "category",
      header: "類別",
      cell: ({ row }) => {
        return <span className="text-xs font-medium">{row.original.category.name}</span>;
      },
    },
    {
      accessorKey: "location",
      header: "地點 (大樓 / 空間)",
      cell: ({ row }) => {
        const space = row.original.space;
        const bldgName = space.building.name;
        const spaceName = space.name;
        const floor = space.floor ? `${space.floor}F` : "";
        return (
          <div className="flex flex-col text-xs">
            <span className="font-medium text-foreground">{bldgName}</span>
            <span className="text-muted-foreground">
              {spaceName} {floor}
            </span>
          </div>
        );
      },
    },
    {
      accessorKey: "description",
      header: "說明摘要",
      cell: ({ row }) => {
        return (
          <span className="line-clamp-1 max-w-[240px] text-xs text-muted-foreground">{row.original.description}</span>
        );
      },
    },
  ];

  if (canViewReporter) {
    columns.push({
      accessorKey: "reporter",
      header: "通報人聯絡資訊",
      cell: ({ row }) => {
        const email = row.original.reporter_email;
        const phone = row.original.reporter_phone;
        return (
          <div className="flex flex-col gap-0.5 text-xs">
            {email && (
              <span className="flex items-center gap-1 text-foreground">
                <Mail className="size-3 text-muted-foreground" />
                {email}
              </span>
            )}
            {phone && (
              <span className="flex items-center gap-1 text-muted-foreground">
                <Phone className="size-3" />
                {phone}
              </span>
            )}
            {!email && !phone && <span className="text-muted-foreground italic">-</span>}
          </div>
        );
      },
    });
  }

  columns.push({
    accessorKey: "created_at",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="-ml-3 h-8 gap-1 text-xs font-medium"
        >
          通報時間
          <ArrowUpDown className="size-3" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const dateStr = row.getValue("created_at") as string;
      const formattedDate = dateStr ? format(new Date(dateStr), "yyyy/MM/dd HH:mm", { locale: zhTW }) : "-";
      return <span className="text-xs text-muted-foreground whitespace-nowrap">{formattedDate}</span>;
    },
  });

  return columns;
}
