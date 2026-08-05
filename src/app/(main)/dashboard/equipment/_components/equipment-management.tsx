"use client";

import { useMemo, useState } from "react";

import { Edit2, HardDrive, History, MapPin, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import {
  createEquipment,
  type EquipmentFormData,
  type EquipmentRow,
  updateEquipment,
} from "../_actions/equipment-actions";
import { EquipmentDeleteDialog } from "./equipment-delete-dialog";
import { type BuildingOption, EquipmentDialog } from "./equipment-dialog";
import { EquipmentHistorySheet } from "./equipment-history-sheet";
import { getWarrantyStatus, WarrantyStatusBadge } from "./warranty-status-badge";

interface EquipmentManagementProps {
  initialEquipment: EquipmentRow[];
  buildings: BuildingOption[];
}

export function EquipmentManagement({ initialEquipment, buildings }: EquipmentManagementProps) {
  const [equipmentList, setEquipmentList] = useState<EquipmentRow[]>(initialEquipment);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [buildingFilter, setBuildingFilter] = useState("all");
  const [warrantyFilter, setWarrantyFilter] = useState("all");

  // Dialog / Sheet states
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"create" | "edit">("create");
  const [selectedEquipment, setSelectedEquipment] = useState<EquipmentRow | null>(null);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<EquipmentRow | null>(null);

  const [historySheetOpen, setHistorySheetOpen] = useState(false);
  const [historyTarget, setHistoryTarget] = useState<EquipmentRow | null>(null);

  // Sync state if server props change
  if (initialEquipment !== equipmentList) {
    setEquipmentList(initialEquipment);
  }

  // Filtered Equipment List
  const filteredEquipment = useMemo(() => {
    return equipmentList.filter((item) => {
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

      // 3. Warranty Status Filter
      if (warrantyFilter !== "all") {
        const status = getWarrantyStatus(item.warranty_expiry);
        if (status !== warrantyFilter) return false;
      }

      return true;
    });
  }, [equipmentList, searchQuery, buildingFilter, warrantyFilter]);

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
          <h1 className="text-2xl font-bold tracking-tight text-foreground">設備資產管理</h1>
          <p className="text-sm text-muted-foreground">管理全校設備資產、追蹤保固期限與查看歷史維修紀錄</p>
        </div>
        <Button onClick={handleCreateOpen} className="shrink-0 gap-1.5">
          <Plus className="h-4 w-4" />
          新增設備
        </Button>
      </div>

      {/* Main Card */}
      <Card className="border-border/60 shadow-xs">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">設備資產列表</CardTitle>
          <CardDescription>按大樓位置與保固狀態快速檢索設備資料</CardDescription>

          {/* Filter Toolbar */}
          <div className="mt-4 flex flex-wrap items-center gap-3">
            {/* Search Input */}
            <div className="relative min-w-56 flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="搜尋設備名稱或代碼..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-sm"
              />
            </div>

            {/* Building Filter */}
            <Select value={buildingFilter} onValueChange={setBuildingFilter}>
              <SelectTrigger size="sm" className="h-9 min-w-36">
                <SelectValue placeholder="所有大樓" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">所有大樓</SelectItem>
                {buildings.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name} ({b.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Warranty Status Filter */}
            <Select value={warrantyFilter} onValueChange={setWarrantyFilter}>
              <SelectTrigger size="sm" className="h-9 min-w-32">
                <SelectValue placeholder="保固狀態" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">所有保固狀態</SelectItem>
                <SelectItem value="active">保固中</SelectItem>
                <SelectItem value="expired">已過期</SelectItem>
                <SelectItem value="none">未設定</SelectItem>
              </SelectContent>
            </Select>

            {(searchQuery || buildingFilter !== "all" || warrantyFilter !== "all") && (
              <Button
                variant="ghost"
                size="sm"
                className="h-9 px-2 text-xs text-muted-foreground hover:text-foreground"
                onClick={() => {
                  setSearchQuery("");
                  setBuildingFilter("all");
                  setWarrantyFilter("all");
                }}
              >
                重設篩選
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent>
          {filteredEquipment.length === 0 ? (
            <div className="flex h-40 flex-col items-center justify-center rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
              {equipmentList.length === 0 ? "目前尚無任何設備資料，請點擊右上角新增。" : "找不到符合條件的設備資產。"}
            </div>
          ) : (
            <div className="rounded-md border bg-background overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>設備名稱</TableHead>
                    <TableHead className="w-[140px]">資產代碼</TableHead>
                    <TableHead>所在位置</TableHead>
                    <TableHead className="w-[120px]">購入日期</TableHead>
                    <TableHead className="w-[120px]">保固到期</TableHead>
                    <TableHead className="w-[100px]">保固狀態</TableHead>
                    <TableHead className="w-[140px] text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEquipment.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <HardDrive className="h-4 w-4 shrink-0 text-muted-foreground" />
                          <span>{item.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        <Badge variant="outline" className="font-mono">
                          {item.code}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <MapPin className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                          <span className="text-foreground font-normal">{item.space.building.name}</span>
                          <span>/</span>
                          <span>{item.space.name}</span>
                          <span className="text-xs text-muted-foreground font-mono">
                            ({item.space.floor > 0 ? `${item.space.floor}F` : `B${Math.abs(item.space.floor)}`})
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground font-mono">
                        {item.purchase_date ?? "-"}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground font-mono">
                        {item.warranty_expiry ?? "-"}
                      </TableCell>
                      <TableCell>
                        <WarrantyStatusBadge warrantyExpiry={item.warranty_expiry} />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                            onClick={() => handleHistoryOpen(item)}
                            title="查看維修歷史"
                          >
                            <History className="h-4 w-4" />
                            <span className="sr-only">維修歷史</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                            onClick={() => handleEditOpen(item)}
                            title="編輯設備"
                          >
                            <Edit2 className="h-4 w-4" />
                            <span className="sr-only">編輯設備</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                            onClick={() => handleDeleteOpen(item)}
                            title="刪除設備"
                          >
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">刪除設備</span>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
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
    </div>
  );
}
