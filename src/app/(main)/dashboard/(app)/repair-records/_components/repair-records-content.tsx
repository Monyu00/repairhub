"use client";

import { useCallback, useEffect, useState, useTransition } from "react";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { ChevronLeftIcon, ChevronRightIcon, ClipboardX, FilterX, Search, Wrench } from "lucide-react";

import { TicketStatusBadge } from "@/components/tickets/ticket-status-badge";
import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { Pagination, PaginationContent, PaginationItem } from "@/components/ui/pagination";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatTicketDate, formatTicketLocation } from "@/lib/formatters";

import { RepairRecordMobileCard } from "./repair-record-mobile-card";
import type { RepairRecordItem, TechnicianOption } from "./repair-records-types";

interface RepairRecordsContentProps {
  records: RepairRecordItem[];
  totalCount: number;
  currentPage: number;
  pageSize: number;
  isAdmin: boolean;
  technicians: TechnicianOption[];
}

interface RepairRecordTableRowProps {
  record: RepairRecordItem;
  isAdmin: boolean;
  href: string;
}

export function RepairRecordTableRow({ record, isAdmin, href }: RepairRecordTableRowProps) {
  const formattedDate = formatTicketDate(record.createdAt);

  return (
    <TableRow className="hover:bg-muted/60 focus-within:bg-muted/70 relative cursor-pointer transition-colors">
      <TableCell className="py-3 font-mono text-xs font-medium">
        <Link href={href} className="absolute inset-0 z-0" aria-hidden="true" tabIndex={-1} />
        <Link
          href={href}
          aria-label={`查看報修單 ${record.id.slice(0, 8)}`}
          className="focus-visible:ring-ring relative z-10 rounded-sm outline-none focus-visible:ring-2"
        >
          #{record.id.slice(0, 8)}
        </Link>
      </TableCell>
      <TableCell className="py-3">
        <TicketStatusBadge status={record.status} />
      </TableCell>
      <TableCell className="py-3 text-xs font-medium">{record.category.name}</TableCell>
      <TableCell className="py-3 text-xs">
        <span>{formatTicketLocation(record, { includeFloor: true })}</span>
      </TableCell>
      <TableCell className="py-3 text-xs">
        <p className="text-muted-foreground line-clamp-2">{record.description}</p>
      </TableCell>
      {isAdmin && (
        <TableCell className="py-3 text-xs">
          {record.technicianName ? (
            <span className="text-foreground inline-flex items-center gap-1 font-medium">
              <Wrench className="text-primary size-3" />
              <span>{record.technicianName}</span>
            </span>
          ) : (
            <span className="text-muted-foreground">-</span>
          )}
        </TableCell>
      )}
      <TableCell className="py-3 text-xs">
        {record.reporterName ? (
          <div className="space-y-0.5">
            <span className="text-foreground block truncate font-medium">{record.reporterName}</span>
            {record.reporterDepartment && (
              <span className="text-muted-foreground block truncate text-xs">{record.reporterDepartment}</span>
            )}
          </div>
        ) : (
          <span className="text-muted-foreground">-</span>
        )}
      </TableCell>
      <TableCell className="text-muted-foreground py-3 text-xs whitespace-nowrap">{formattedDate}</TableCell>
    </TableRow>
  );
}

export function RepairRecordsContent({
  records,
  totalCount,
  currentPage,
  pageSize,
  isAdmin,
  technicians,
}: RepairRecordsContentProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const searchParamQuery = searchParams.get("q") ?? "";
  const [searchTerm, setSearchTerm] = useState(searchParamQuery);

  const selectedStatus = searchParams.get("status") ?? "all";
  const selectedTechnician = searchParams.get("technician") ?? "all";

  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  const updateFilters = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());

      if (!("page" in updates)) {
        params.delete("page");
      }

      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === "" || value === "all") {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      }

      startTransition(() => {
        router.push(`${pathname}?${params.toString()}`);
      });
    },
    [pathname, router, searchParams],
  );

  useEffect(() => {
    setSearchTerm(searchParams.get("q") ?? "");
  }, [searchParams]);

  useEffect(() => {
    const currentParam = searchParams.get("q") ?? "";
    if (searchTerm.trim() === currentParam.trim()) {
      return;
    }
    const timer = setTimeout(() => {
      updateFilters({ q: searchTerm.trim() || null });
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm, searchParams, updateFilters]);

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return;
    updateFilters({ page: newPage.toString() });
  };

  const returnTo = searchParams.size > 0 ? `${pathname}?${searchParams.toString()}` : pathname;
  const createDetailHref = (id: string) => `/dashboard/tickets/${id}?returnTo=${encodeURIComponent(returnTo)}`;

  const handleResetFilters = () => {
    setSearchTerm("");
    startTransition(() => {
      router.push(pathname);
    });
  };

  const hasActiveFilters =
    Boolean(searchParamQuery) || selectedStatus !== "all" || (isAdmin && selectedTechnician !== "all");

  let emptyDescription = "您目前尚未接單或被指派任何維修案件。可至「報修單管理」的待處理接單分頁查看可承接案件。";
  if (hasActiveFilters) {
    emptyDescription = "找不到符合目前篩選條件的維修紀錄，請嘗試切換狀態、維修人員或搜尋關鍵字。";
  } else if (isAdmin) {
    emptyDescription = "目前系統中尚無進行中或已完成的維修單據紀錄。";
  }

  return (
    <div className="space-y-4">
      {/* Filter Controls Bar */}
      <div className="bg-card/60 flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3.5 shadow-xs backdrop-blur-xs">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Search Input */}
          <div className="relative w-full sm:w-56 md:w-64">
            <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2" />
            <Input
              type="search"
              placeholder="搜尋單號、描述、通報人..."
              aria-label="搜尋單號、描述、通報人"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-8 pl-8 text-xs"
            />
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground text-xs">狀態：</span>
            <Select value={selectedStatus} onValueChange={(val) => updateFilters({ status: val })} disabled={isPending}>
              <SelectTrigger aria-label="依狀態篩選維修紀錄" className="h-8 w-[130px] text-xs">
                <SelectValue placeholder="維修狀態" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部狀態</SelectItem>
                <SelectItem value="in_progress">維修中</SelectItem>
                <SelectItem value="completed">已完工</SelectItem>
                <SelectItem value="closed">已結案</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Technician Filter (Admin only) */}
          {isAdmin && (
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground text-xs">維修人員：</span>
              <Select
                value={selectedTechnician}
                onValueChange={(val) => updateFilters({ technician: val })}
                disabled={isPending}
              >
                <SelectTrigger aria-label="依維修人員篩選維修紀錄" className="h-8 min-w-[150px] text-xs">
                  <SelectValue placeholder="全部維修人員" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部維修人員</SelectItem>
                  {technicians.map((tech) => (
                    <SelectItem key={tech.id} value={tech.id}>
                      {tech.displayName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Reset Filters Button */}
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleResetFilters}
              disabled={isPending}
              className="text-muted-foreground hover:text-foreground h-11 gap-1 px-2 text-xs sm:h-8"
            >
              <FilterX className="size-3.5" />
              <span>清除篩選</span>
            </Button>
          )}
        </div>

        <div className="text-muted-foreground text-xs">
          共 <span className="text-foreground font-semibold">{totalCount}</span> 筆維修紀錄
        </div>
      </div>

      {/* Main Content */}
      {records.length === 0 ? (
        <Empty className="bg-card/40 my-8 border border-dashed py-12">
          <EmptyMedia variant="icon">
            <ClipboardX className="text-muted-foreground size-6" />
          </EmptyMedia>
          <EmptyHeader>
            <EmptyTitle>目前無維修紀錄</EmptyTitle>
            <EmptyDescription>{emptyDescription}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="bg-card/70 hidden overflow-hidden rounded-xl border shadow-2xs backdrop-blur-xs md:block">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow>
                  <TableHead className="h-10 w-[110px] text-xs font-semibold">單據編號</TableHead>
                  <TableHead className="h-10 w-[100px] text-xs font-semibold">狀態</TableHead>
                  <TableHead className="h-10 w-[120px] text-xs font-semibold">類別</TableHead>
                  <TableHead className="h-10 text-xs font-semibold">地點</TableHead>
                  <TableHead className="h-10 min-w-[200px] text-xs font-semibold">報修描述</TableHead>
                  {isAdmin && <TableHead className="h-10 w-[130px] text-xs font-semibold">負責技師</TableHead>}
                  <TableHead className="h-10 w-[130px] text-xs font-semibold">報修人</TableHead>
                  <TableHead className="h-10 w-[140px] text-xs font-semibold">通報時間</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((record) => (
                  <RepairRecordTableRow
                    key={record.id}
                    record={record}
                    isAdmin={isAdmin}
                    href={createDetailHref(record.id)}
                  />
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Card View */}
          <div className="grid gap-3 md:hidden">
            {records.map((record) => (
              <RepairRecordMobileCard
                key={record.id}
                record={record}
                isAdmin={isAdmin}
                href={createDetailHref(record.id)}
              />
            ))}
          </div>

          {/* Pagination & Count */}
          <div className="flex flex-col items-center justify-between gap-3 pt-2 sm:flex-row">
            <div className="text-muted-foreground text-xs">
              顯示第 <span className="text-foreground font-medium">{(currentPage - 1) * pageSize + 1}</span> 到{" "}
              <span className="text-foreground font-medium">{Math.min(currentPage * pageSize, totalCount)}</span> 筆，共{" "}
              <span className="text-foreground font-medium">{totalCount}</span> 筆紀錄
            </div>

            {totalPages > 1 && (
              <Pagination className="mx-0 w-auto">
                <PaginationContent>
                  <PaginationItem>
                    <Button
                      type="button"
                      variant="ghost"
                      size="default"
                      aria-label="上一頁"
                      disabled={currentPage <= 1 || isPending}
                      onClick={() => handlePageChange(currentPage - 1)}
                      className="pl-1.5!"
                    >
                      <ChevronLeftIcon data-icon="inline-start" />
                      <span className="hidden sm:block">上一頁</span>
                    </Button>
                  </PaginationItem>
                  <PaginationItem className="text-muted-foreground px-3 text-xs font-medium">
                    頁次 {currentPage} / {totalPages}
                  </PaginationItem>
                  <PaginationItem>
                    <Button
                      type="button"
                      variant="ghost"
                      size="default"
                      aria-label="下一頁"
                      disabled={currentPage >= totalPages || isPending}
                      onClick={() => handlePageChange(currentPage + 1)}
                      className="pr-1.5!"
                    >
                      <span className="hidden sm:block">下一頁</span>
                      <ChevronRightIcon data-icon="inline-end" />
                    </Button>
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            )}
          </div>
        </>
      )}
    </div>
  );
}
