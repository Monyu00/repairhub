"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { zhTW } from "date-fns/locale/zh-TW";
import { ArrowUpDown, Mail, Phone, User } from "lucide-react";

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
        return <span className="font-mono font-semibold text-primary text-xs">#{id.slice(0, 8)}</span>;
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
        const space = row.original.space;
        return (
          <div className="flex flex-col text-xs">
            <span className="font-medium text-foreground">
              {space.building.name} ({space.building.code})
            </span>
            <span className="text-muted-foreground">
              {space.name} ({space.floor}F)
            </span>
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
        const name = row.original.reporter_name;
        const dept = row.original.reporter_department;
        const email = row.original.reporter_email;
        const phone = row.original.reporter_phone;
        return (
          <div className="flex flex-col gap-0.5 text-xs">
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
    accessorKey: "created_at",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="-ml-3 h-8 gap-1 font-medium text-xs"
        >
          通報時間
          <ArrowUpDown className="size-3" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const dateStr = row.getValue("created_at") as string;
      const formattedDate = dateStr ? format(new Date(dateStr), "yyyy/MM/dd HH:mm", { locale: zhTW }) : "-";
      return <span className="whitespace-nowrap text-muted-foreground text-xs">{formattedDate}</span>;
    },
  });

  return columns;
}
