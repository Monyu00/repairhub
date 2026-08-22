"use client";

import { useMemo, useState } from "react";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table";
import { ClipboardX, ListFilter, Zap } from "lucide-react";

import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { PendingTicketsView } from "./pending-tickets-view";
import { getTicketColumns } from "./ticket-columns";
import { TicketFilterBar } from "./ticket-filter-bar";
import { TicketMobileCard } from "./ticket-mobile-card";
import type { FilterOptions, TicketRow } from "./ticket-types";

interface TicketsDataTableProps {
  tickets: TicketRow[];
  totalCount: number;
  currentPage: number;
  pageSize: number;
  filterOptions: FilterOptions;
  canViewReporter: boolean;
  userId?: string | null;
  userRole?: string | null;
}

export function TicketsDataTable({
  tickets,
  totalCount,
  currentPage,
  pageSize,
  filterOptions,
  canViewReporter,
  userId,
  userRole,
}: TicketsDataTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [activeTab, setActiveTab] = useState("all");

  const isTechnician = userRole === "technician";
  const columns = useMemo(() => getTicketColumns(canViewReporter), [canViewReporter]);

  const table = useReactTable({
    data: tickets,
    columns,
    state: {
      sorting,
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", newPage.toString());
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleRowClick = (ticketId: string) => {
    router.push(`/dashboard/tickets/${ticketId}`);
  };

  const renderAllTicketsView = () => (
    <div className="space-y-4">
      {/* Filters Bar */}
      <TicketFilterBar filterOptions={filterOptions} />

      {/* Main Content Area */}
      {tickets.length === 0 ? (
        <Empty className="my-8 border border-dashed bg-card/40 py-12">
          <EmptyMedia variant="icon">
            <ClipboardX className="size-6 text-muted-foreground" />
          </EmptyMedia>
          <EmptyHeader>
            <EmptyTitle>目前無符合條件的報修單</EmptyTitle>
            <EmptyDescription>
              找不到符合目前篩選條件的報修紀錄。請嘗試調整或清除狀態、類別、地點或日期篩選。
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden overflow-hidden rounded-xl border bg-card/70 shadow-2xs backdrop-blur-xs md:block">
            <Table>
              <TableHeader className="bg-muted/40">
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <TableHead key={header.id} className="h-10 font-semibold text-xs">
                        {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    onClick={() => handleRowClick(row.original.id)}
                    className="cursor-pointer transition-colors hover:bg-muted/60"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id} className="py-3 text-xs">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Card View */}
          <div className="grid gap-3 md:hidden">
            {tickets.map((ticket) => (
              <button
                type="button"
                key={ticket.id}
                onClick={() => handleRowClick(ticket.id)}
                className="w-full text-left"
              >
                <TicketMobileCard ticket={ticket} canViewReporter={canViewReporter} />
              </button>
            ))}
          </div>

          {/* Pagination & Count Info */}
          <div className="flex flex-col items-center justify-between gap-3 pt-2 sm:flex-row">
            <div className="text-muted-foreground text-xs">
              顯示第 <span className="font-medium text-foreground">{(currentPage - 1) * pageSize + 1}</span> 到{" "}
              <span className="font-medium text-foreground">{Math.min(currentPage * pageSize, totalCount)}</span> 筆，共{" "}
              <span className="font-medium text-foreground">{totalCount}</span> 筆報修單
            </div>

            {totalPages > 1 && (
              <Pagination className="mx-0 w-auto">
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      text="上一頁"
                      onClick={() => handlePageChange(currentPage - 1)}
                      className={currentPage <= 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                  </PaginationItem>
                  <PaginationItem className="px-3 font-medium text-muted-foreground text-xs">
                    頁次 {currentPage} / {totalPages}
                  </PaginationItem>
                  <PaginationItem>
                    <PaginationNext
                      text="下一頁"
                      onClick={() => handlePageChange(currentPage + 1)}
                      className={currentPage >= totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            )}
          </div>
        </>
      )}
    </div>
  );

  if (!isTechnician || !userId) {
    return renderAllTicketsView();
  }

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
      <TabsList className="h-9 p-1">
        <TabsTrigger value="all" className="gap-1.5 px-3 text-xs">
          <ListFilter className="size-3.5" />
          <span>全校報修單據</span>
        </TabsTrigger>
        <TabsTrigger value="pending" className="gap-1.5 px-3 text-xs">
          <Zap className="size-3.5 fill-amber-500/20 text-amber-500" />
          <span>待處理接單 (即時)</span>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="all" className="mt-0">
        {renderAllTicketsView()}
      </TabsContent>

      <TabsContent value="pending" className="mt-0">
        <PendingTicketsView userId={userId} canViewReporter={canViewReporter} />
      </TabsContent>
    </Tabs>
  );
}
