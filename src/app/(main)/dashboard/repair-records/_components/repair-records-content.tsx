"use client";

import { useTransition } from "react";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { ClipboardX, FilterX, User, Wrench } from "lucide-react";

import { TicketStatusBadge } from "@/app/(main)/dashboard/tickets/_components/ticket-status-badge";
import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import { RepairRecordMobileCard } from "./repair-record-mobile-card";
import { formatRepairRecordDate, type RepairRecordItem, type TechnicianOption } from "./repair-records-types";

interface RepairRecordsContentProps {
  records: RepairRecordItem[];
  totalCount: number;
  currentPage: number;
  pageSize: number;
  isAdmin: boolean;
  technicians: TechnicianOption[];
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

  const selectedStatus = searchParams.get("status") ?? "all";
  const selectedTechnician = searchParams.get("technician") ?? "all";

  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  const updateFilters = (updates: Record<string, string | null>) => {
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
  };

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return;
    updateFilters({ page: newPage.toString() });
  };

  const handleRowClick = (id: string) => {
    router.push(`/dashboard/tickets/${id}`);
  };

  const hasActiveFilters = selectedStatus !== "all" || (isAdmin && selectedTechnician !== "all");

  return (
    <div className="space-y-4">
      {/* Filter Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card/60 p-3 shadow-2xs backdrop-blur-xs">
        <div className="flex flex-wrap items-center gap-3">
          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-xs">狀態：</span>
            <Select value={selectedStatus} onValueChange={(val) => updateFilters({ status: val })} disabled={isPending}>
              <SelectTrigger className="h-8 w-[130px] text-xs">
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
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground text-xs">維修人員：</span>
              <Select
                value={selectedTechnician}
                onValueChange={(val) => updateFilters({ technician: val })}
                disabled={isPending}
              >
                <SelectTrigger className="h-8 min-w-[150px] text-xs">
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
              onClick={() => {
                startTransition(() => {
                  router.push(pathname);
                });
              }}
              disabled={isPending}
              className="h-8 gap-1 px-2 text-muted-foreground text-xs hover:text-foreground"
            >
              <FilterX className="size-3.5" />
              <span>清除篩選</span>
            </Button>
          )}
        </div>

        <div className="text-muted-foreground text-xs">
          共 <span className="font-semibold text-foreground">{totalCount}</span> 筆維修紀錄
        </div>
      </div>

      {/* Main Content */}
      {records.length === 0 ? (
        <Empty className="my-8 border border-dashed bg-card/40 py-12">
          <EmptyMedia variant="icon">
            <ClipboardX className="size-6 text-muted-foreground" />
          </EmptyMedia>
          <EmptyHeader>
            <EmptyTitle>目前無維修紀錄</EmptyTitle>
            <EmptyDescription>
              {hasActiveFilters
                ? "找不到符合目前篩選條件的維修紀錄，請嘗試切換狀態或維修人員篩選。"
                : isAdmin
                  ? "目前系統中尚無進行中或已完成的維修單據紀錄。"
                  : "您目前尚未接單或被指派任何維修案件。可至「報修單管理」的待處理接單分頁查看可承接案件。"}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden overflow-hidden rounded-xl border bg-card/70 shadow-2xs backdrop-blur-xs md:block">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow>
                  <TableHead className="w-[110px] h-10 font-semibold text-xs">單據編號</TableHead>
                  <TableHead className="w-[100px] h-10 font-semibold text-xs">狀態</TableHead>
                  <TableHead className="w-[120px] h-10 font-semibold text-xs">類別</TableHead>
                  <TableHead className="h-10 font-semibold text-xs">地點</TableHead>
                  <TableHead className="min-w-[200px] h-10 font-semibold text-xs">報修描述</TableHead>
                  {isAdmin && <TableHead className="w-[130px] h-10 font-semibold text-xs">負責技師</TableHead>}
                  <TableHead className="w-[130px] h-10 font-semibold text-xs">報修人</TableHead>
                  <TableHead className="w-[140px] h-10 font-semibold text-xs">通報時間</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((record) => {
                  const formattedDate = formatRepairRecordDate(record.createdAt);

                  return (
                    <TableRow
                      key={record.id}
                      onClick={() => handleRowClick(record.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          handleRowClick(record.id);
                        }
                      }}
                      tabIndex={0}
                      className="cursor-pointer transition-colors hover:bg-muted/60 focus-visible:outline-hidden focus-visible:bg-muted/70"
                    >
                      <TableCell className="py-3 font-mono font-medium text-xs">#{record.id.slice(0, 8)}</TableCell>
                      <TableCell className="py-3">
                        <TicketStatusBadge status={record.status} />
                      </TableCell>
                      <TableCell className="py-3 text-xs font-medium">{record.category.name}</TableCell>
                      <TableCell className="py-3 text-xs">
                        <span className="font-medium text-foreground">{record.space.building.name}</span>
                        <span className="text-muted-foreground">
                          {" "}
                          - {record.space.name} ({record.space.floor}F)
                        </span>
                      </TableCell>
                      <TableCell className="py-3 text-xs">
                        <p className="line-clamp-2 text-muted-foreground">{record.description}</p>
                      </TableCell>
                      {isAdmin && (
                        <TableCell className="py-3 text-xs">
                          {record.technicianName ? (
                            <span className="inline-flex items-center gap-1 font-medium text-foreground">
                              <Wrench className="size-3 text-primary" />
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
                            <span className="font-medium text-foreground block truncate">{record.reporterName}</span>
                            {record.reporterDepartment && (
                              <span className="text-[11px] text-muted-foreground block truncate">
                                {record.reporterDepartment}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="py-3 text-xs text-muted-foreground whitespace-nowrap">
                        {formattedDate}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Card View */}
          <div className="grid gap-3 md:hidden">
            {records.map((record) => (
              <button
                type="button"
                key={record.id}
                onClick={() => handleRowClick(record.id)}
                className="w-full text-left"
              >
                <RepairRecordMobileCard record={record} isAdmin={isAdmin} />
              </button>
            ))}
          </div>

          {/* Pagination & Count */}
          <div className="flex flex-col items-center justify-between gap-3 pt-2 sm:flex-row">
            <div className="text-muted-foreground text-xs">
              顯示第 <span className="font-medium text-foreground">{(currentPage - 1) * pageSize + 1}</span> 到{" "}
              <span className="font-medium text-foreground">{Math.min(currentPage * pageSize, totalCount)}</span> 筆，共{" "}
              <span className="font-medium text-foreground">{totalCount}</span> 筆紀錄
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
}
