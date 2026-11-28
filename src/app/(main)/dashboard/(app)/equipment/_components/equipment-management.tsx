"use client";

import { useMemo, useState } from "react";

import { Edit2, FileUp, FilterX, HardDrive, History, MapPin, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { BulkImportDialog } from "@/app/(main)/dashboard/_components/bulk-import-dialog";
import { TicketStatusBadge } from "@/components/tickets/ticket-status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { LocationCatalogBuilding } from "@/lib/locations";
import type { TicketStatus } from "@/server/tickets/lifecycle";

import {
  createEquipment,
  type EquipmentFormData,
  type EquipmentRow,
  updateEquipment,
} from "../_actions/equipment-actions";
import { EquipmentDeleteDialog } from "./equipment-delete-dialog";
import { EquipmentDialog } from "./equipment-dialog";
import { EquipmentHistorySheet } from "./equipment-history-sheet";

const PAGE_SIZE = 10;

interface EquipmentManagementProps {
  initialEquipment: EquipmentRow[];
  buildings: LocationCatalogBuilding[];
}

export function EquipmentManagement({ initialEquipment, buildings }: EquipmentManagementProps) {
  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [buildingFilter, setBuildingFilter] = useState("all");
  const [repairStatusFilter, setRepairStatusFilter] = useState<TicketStatus | "normal" | "all">("all");
  const [currentPage, setCurrentPage] = useState(1);

  // Dialog / Sheet states
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"create" | "edit">("create");
  const [selectedEquipment, setSelectedEquipment] = useState<EquipmentRow | null>(null);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<EquipmentRow | null>(null);

  const [historySheetOpen, setHistorySheetOpen] = useState(false);
  const [historyTarget, setHistoryTarget] = useState<EquipmentRow | null>(null);
  const [bulkImportOpen, setBulkImportOpen] = useState(false);

  // Filtered Equipment List
  const filteredEquipment = useMemo(() => {
    return initialEquipment.filter((item) => {
      // 1. Search Query (Name or Code)
      if (searchQuery.trim()) {
        const query = searchQuery.trim().toLowerCase();
        const matchName = item.name.toLowerCase().includes(query);
        const matchCode = item.code.toLowerCase().includes(query);
        if (!matchName && !matchCode) return false;
      }

      // 2. Building Filter
      if (buildingFilter !== "all") {
        const bId = item.space.building_id || item.space.building.id;
        if (bId !== buildingFilter) return false;
      }

      // 3. Current Repair Status Filter
      if (repairStatusFilter !== "all") {
        const status = item.current_repair_status;
        if (repairStatusFilter === "normal" ? status !== null : status !== repairStatusFilter) return false;
      }

      return true;
    });
  }, [initialEquipment, searchQuery, buildingFilter, repairStatusFilter]);

  const totalPages = Math.ceil(filteredEquipment.length / PAGE_SIZE) || 1;
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const paginatedEquipment = useMemo(() => {
    const start = (safeCurrentPage - 1) * PAGE_SIZE;
    return filteredEquipment.slice(start, start + PAGE_SIZE);
  }, [filteredEquipment, safeCurrentPage]);

  // Handlers
  const handleCreateOpen = () => {
    setDialogMode("create");
    setSelectedEquipment(null);
    setDialogOpen(true);
  };

  const handleEditOpen = (item: EquipmentRow) => {
    setDialogMode("edit");
    setSelectedEquipment(item);
    setDialogOpen(true);
  };

  const handleDeleteOpen = (item: EquipmentRow) => {
    setDeleteTarget(item);
    setDeleteDialogOpen(true);
  };

  const handleHistoryOpen = (item: EquipmentRow) => {
    setHistoryTarget(item);
    setHistorySheetOpen(true);
  };

  const handleDialogSubmit = async (data: EquipmentFormData) => {
    if (dialogMode === "create") {
      const res = await createEquipment(data);
      if (res.success) {
        toast.success("設備建立成功");
      }
      return res;
    }

    if (dialogMode === "edit" && selectedEquipment) {
      const res = await updateEquipment(selectedEquipment.id, data);
      if (res.success) {
        toast.success("設備資訊已更新");
      }
      return res;
    }

    return { success: false, error: "無效的操作標的" };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-foreground text-2xl font-bold tracking-tight">設備資產管理</h1>
          <p className="text-muted-foreground text-sm">管理全校設備資產、追蹤保固期限與查看歷史維修紀錄</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button variant="outline" onClick={() => setBulkImportOpen(true)} className="shrink-0 gap-1.5">
            <FileUp data-icon="inline-start" />
            批次匯入
          </Button>
          <Button onClick={handleCreateOpen} className="shrink-0 gap-1.5">
            <Plus className="h-4 w-4" />
            新增設備
          </Button>
        </div>
      </div>

      {/* Main Card */}
      <Card className="border-border/60 shadow-xs">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">設備資產列表</CardTitle>
          <CardDescription>依地點與目前維修狀態快速檢索設備資料</CardDescription>

          {/* Filter Toolbar */}
          <div className="bg-card/60 mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3.5 shadow-xs backdrop-blur-xs">
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Search Input */}
              <div className="relative w-full sm:w-56 md:w-64">
                <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2" />
                <Input
                  type="search"
                  placeholder="搜尋設備名稱或代碼..."
                  aria-label="搜尋設備名稱或代碼"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="h-8 pl-8 text-xs"
                />
              </div>

              {/* Building Filter */}
              <Select
                value={buildingFilter}
                onValueChange={(val) => {
                  setBuildingFilter(val);
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger size="sm" className="h-8 min-w-36 text-xs">
                  <SelectValue placeholder="所有地點" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">所有地點</SelectItem>
                  {buildings.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name} ({b.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Current Repair Status Filter */}
              <Select
                value={repairStatusFilter}
                onValueChange={(val) => {
                  setRepairStatusFilter(val as TicketStatus | "normal" | "all");
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger size="sm" className="h-8 min-w-32 text-xs">
                  <SelectValue placeholder="目前維修狀態" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="all">所有維修狀態</SelectItem>
                    <SelectItem value="pending">待處理</SelectItem>
                    <SelectItem value="in_progress">維修中</SelectItem>
                    <SelectItem value="normal">正常</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>

              {(searchQuery || buildingFilter !== "all" || repairStatusFilter !== "all") && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-foreground h-11 gap-1 px-2 text-xs sm:h-8"
                  onClick={() => {
                    setSearchQuery("");
                    setBuildingFilter("all");
                    setRepairStatusFilter("all");
                    setCurrentPage(1);
                  }}
                >
                  <FilterX className="size-3.5" />
                  <span>清除篩選</span>
                </Button>
              )}
            </div>

            <div className="text-muted-foreground text-xs">
              共 <span className="text-foreground font-semibold">{filteredEquipment.length}</span> 筆設備
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {filteredEquipment.length === 0 ? (
            <Empty className="bg-card/40 border border-dashed py-10">
              <EmptyMedia variant="icon">
                <HardDrive />
              </EmptyMedia>
              <EmptyHeader>
                <EmptyTitle>{initialEquipment.length === 0 ? "尚未建立設備資產" : "找不到符合條件的設備"}</EmptyTitle>
                <EmptyDescription>
                  {initialEquipment.length === 0
                    ? "目前尚無任何設備資料，請點擊右上角新增。"
                    : "找不到符合條件的設備資產。"}
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <>
              <div className="bg-background overflow-hidden rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead>設備名稱</TableHead>
                      <TableHead className="w-[140px]">資產代碼</TableHead>
                      <TableHead>所在位置</TableHead>
                      <TableHead className="w-[120px]">購入日期</TableHead>
                      <TableHead className="w-[120px]">保固到期</TableHead>
                      <TableHead className="w-[120px]">目前維修狀態</TableHead>
                      <TableHead className="w-[140px] text-right">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedEquipment.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <HardDrive className="text-muted-foreground size-4 shrink-0" />
                            <span>{item.name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          <Badge variant="outline" className="font-mono">
                            {item.code}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          <div className="text-muted-foreground flex items-center gap-1.5">
                            <MapPin className="text-muted-foreground size-3.5 shrink-0" />
                            <span className="text-foreground font-normal">{item.space.building.name}</span>
                            <span>/</span>
                            <span>{item.space.name}</span>
                            <span className="text-muted-foreground font-mono text-xs">
                              ({item.space.floor > 0 ? `${item.space.floor}F` : `B${Math.abs(item.space.floor)}`})
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground font-mono text-xs">
                          {item.purchase_date ?? "-"}
                        </TableCell>
                        <TableCell className="text-muted-foreground font-mono text-xs">
                          {item.warranty_expiry ?? "-"}
                        </TableCell>
                        <TableCell>
                          {item.current_repair_status ? (
                            <TicketStatusBadge status={item.current_repair_status} />
                          ) : (
                            <Badge variant="success" className="gap-1">
                              <span className="bg-success size-1.5 shrink-0 rounded-full" />
                              <span>正常</span>
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-muted-foreground hover:text-foreground size-8"
                              onClick={() => handleHistoryOpen(item)}
                              title="查看維修歷史"
                            >
                              <History className="size-4" />
                              <span className="sr-only">維修歷史</span>
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-muted-foreground hover:text-foreground size-8"
                              onClick={() => handleEditOpen(item)}
                              title="編輯設備"
                            >
                              <Edit2 className="size-4" />
                              <span className="sr-only">編輯設備</span>
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:bg-destructive/10 hover:text-destructive size-8"
                              onClick={() => handleDeleteOpen(item)}
                              title="刪除設備"
                            >
                              <Trash2 className="size-4" />
                              <span className="sr-only">刪除設備</span>
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination & Count Info */}
              <div className="flex flex-col items-center justify-between gap-3 pt-2 sm:flex-row">
                <div className="text-muted-foreground text-xs">
                  顯示第 <span className="text-foreground font-medium">{(safeCurrentPage - 1) * PAGE_SIZE + 1}</span> 到{" "}
                  <span className="text-foreground font-medium">
                    {Math.min(safeCurrentPage * PAGE_SIZE, filteredEquipment.length)}
                  </span>{" "}
                  筆，共 <span className="text-foreground font-medium">{filteredEquipment.length}</span> 筆設備
                </div>

                {totalPages > 1 && (
                  <Pagination className="mx-0 w-auto">
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          text="上一頁"
                          onClick={() => setCurrentPage((p) => Math.max(1, Math.min(totalPages, p) - 1))}
                          aria-disabled={safeCurrentPage <= 1}
                          tabIndex={safeCurrentPage <= 1 ? -1 : undefined}
                          className={safeCurrentPage <= 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                        />
                      </PaginationItem>
                      <PaginationItem className="text-muted-foreground px-3 text-xs font-medium">
                        頁次 {safeCurrentPage} / {totalPages}
                      </PaginationItem>
                      <PaginationItem>
                        <PaginationNext
                          text="下一頁"
                          onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                          aria-disabled={safeCurrentPage >= totalPages}
                          tabIndex={safeCurrentPage >= totalPages ? -1 : undefined}
                          className={
                            safeCurrentPage >= totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"
                          }
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Dialogs & Sheets */}
      <EquipmentDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        mode={dialogMode}
        initialData={selectedEquipment}
        buildings={buildings}
        onSubmit={handleDialogSubmit}
      />

      <EquipmentDeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        equipment={deleteTarget}
        onSuccess={() => {
          toast.success(`已刪除設備「${deleteTarget?.name}」`);
        }}
      />

      <EquipmentHistorySheet open={historySheetOpen} onOpenChange={setHistorySheetOpen} equipment={historyTarget} />
      <BulkImportDialog entity="equipment" open={bulkImportOpen} onOpenChange={setBulkImportOpen} />
    </div>
  );
}
