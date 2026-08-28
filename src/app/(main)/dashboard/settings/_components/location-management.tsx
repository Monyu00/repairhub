"use client";

import { useState } from "react";

import { Building2, ChevronDown, ChevronRight, Edit2, MapPin, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import {
  type BuildingWithSpaces,
  createBuilding,
  createSpace,
  deleteBuilding,
  deleteSpace,
  type SpaceItem,
  updateBuilding,
  updateSpace,
} from "../_actions/location-actions";
import { BuildingDialog } from "./building-dialog";
import { DeleteConfirmDialog } from "./delete-confirm-dialog";
import { SpaceDialog } from "./space-dialog";

interface LocationManagementProps {
  initialBuildings: BuildingWithSpaces[];
}

export function LocationManagement({ initialBuildings }: LocationManagementProps) {
  const [buildings, setBuildings] = useState<BuildingWithSpaces[]>(initialBuildings);

  // Expanded building states
  const [openBuildingIds, setOpenBuildingIds] = useState<string[]>(
    initialBuildings.map((b) => b.id), // Default expand all
  );

  // Building Dialog State
  const [buildingDialogOpen, setBuildingDialogOpen] = useState(false);
  const [buildingDialogMode, setBuildingDialogMode] = useState<"create" | "edit">("create");
  const [selectedBuilding, setSelectedBuilding] = useState<BuildingWithSpaces | null>(null);

  // Space Dialog State
  const [spaceDialogOpen, setSpaceDialogOpen] = useState(false);
  const [spaceDialogMode, setSpaceDialogMode] = useState<"create" | "edit">("create");
  const [targetBuildingForSpace, setTargetBuildingForSpace] = useState<BuildingWithSpaces | null>(null);
  const [selectedSpace, setSelectedSpace] = useState<SpaceItem | null>(null);

  // Delete Confirm Dialog State
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{
    type: "building" | "space";
    id: string;
    name: string;
  } | null>(null);

  // Sync state if server props change
  if (initialBuildings !== buildings) {
    setBuildings(initialBuildings);
  }

  const toggleBuildingOpen = (id: string) => {
    setOpenBuildingIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  // Building Handlers
  const handleCreateBuildingOpen = () => {
    setBuildingDialogMode("create");
    setSelectedBuilding(null);
    setBuildingDialogOpen(true);
  };

  const handleEditBuildingOpen = (building: BuildingWithSpaces) => {
    setBuildingDialogMode("edit");
    setSelectedBuilding(building);
    setBuildingDialogOpen(true);
  };

  const handleBuildingSubmit = async (name: string, code: string) => {
    if (buildingDialogMode === "create") {
      const res = await createBuilding(name, code);
      if (res.success) {
        toast.success("大樓新增成功");
      }
      return res;
    }

    if (buildingDialogMode === "edit" && selectedBuilding) {
      const res = await updateBuilding(selectedBuilding.id, name, code);
      if (res.success) {
        toast.success("大樓資訊已更新");
      }
      return res;
    }

    return { success: false, error: "無效的操作標的" };
  };

  // Space Handlers
  const handleCreateSpaceOpen = (building: BuildingWithSpaces) => {
    setSpaceDialogMode("create");
    setTargetBuildingForSpace(building);
    setSelectedSpace(null);
    setSpaceDialogOpen(true);
  };

  const handleEditSpaceOpen = (building: BuildingWithSpaces, space: SpaceItem) => {
    setSpaceDialogMode("edit");
    setTargetBuildingForSpace(building);
    setSelectedSpace(space);
    setSpaceDialogOpen(true);
  };

  const handleSpaceSubmit = async (name: string, floor: number) => {
    if (spaceDialogMode === "create" && targetBuildingForSpace) {
      const res = await createSpace(targetBuildingForSpace.id, name, floor);
      if (res.success) {
        toast.success(`已在「${targetBuildingForSpace.name}」新增空間`);
      }
      return res;
    }

    if (spaceDialogMode === "edit" && selectedSpace) {
      const res = await updateSpace(selectedSpace.id, name, floor);
      if (res.success) {
        toast.success("空間資訊已更新");
      }
      return res;
    }

    return { success: false, error: "無效的操作標的" };
  };

  // Delete Handlers
  const handleDeleteBuildingOpen = (building: BuildingWithSpaces) => {
    setDeleteTarget({
      type: "building",
      id: building.id,
      name: building.name,
    });
    setDeleteDialogOpen(true);
  };

  const handleDeleteSpaceOpen = (space: SpaceItem) => {
    setDeleteTarget({
      type: "space",
      id: space.id,
      name: space.name,
    });
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return { success: false, error: "未指定的刪除標的" };

    if (deleteTarget.type === "building") {
      const res = await deleteBuilding(deleteTarget.id);
      if (res.success) {
        toast.success(`已成功刪除大樓「${deleteTarget.name}」`);
      }
      return res;
    }

    if (deleteTarget.type === "space") {
      const res = await deleteSpace(deleteTarget.id);
      if (res.success) {
        toast.success(`已成功刪除空間「${deleteTarget.name}」`);
      }
      return res;
    }

    return { success: false, error: "未知操作類別" };
  };

  return (
    <Card className="border-border/60 shadow-xs">
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className="text-xl">校園地點與空間管理</CardTitle>
          <CardDescription className="mt-1 text-muted-foreground text-sm">
            維護全校大樓建築與其所屬空間層級結構。刪除前系統會自動檢查相關報修單與設備關聯。
          </CardDescription>
        </div>
        <Button onClick={handleCreateBuildingOpen} className="shrink-0 gap-1.5">
          <Plus className="h-4 w-4" />
          新增大樓
        </Button>
      </CardHeader>

      <CardContent className="space-y-4">
        {buildings.length === 0 ? (
          <div className="flex h-32 flex-col items-center justify-center rounded-lg border border-dashed p-4 text-center text-muted-foreground text-sm">
            目前尚未建立任何校園大樓。
          </div>
        ) : (
          <div className="space-y-3">
            {buildings.map((building) => {
              const isOpen = openBuildingIds.includes(building.id);
              const spaceCount = building.spaces?.length ?? 0;

              return (
                <Collapsible
                  key={building.id}
                  open={isOpen}
                  onOpenChange={() => toggleBuildingOpen(building.id)}
                  className="rounded-lg border border-border bg-card shadow-xs transition-colors"
                >
                  <div className="flex items-center justify-between p-4">
                    <CollapsibleTrigger asChild>
                      <button
                        type="button"
                        className="flex flex-1 items-center gap-3 text-left font-medium hover:text-primary focus-visible:outline-hidden"
                      >
                        {isOpen ? (
                          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                        )}
                        <Building2 className="h-5 w-5 shrink-0 text-muted-foreground" />
                        <span className="font-semibold text-base text-foreground">{building.name}</span>
                        <Badge variant="outline" className="font-mono text-xs uppercase">
                          {building.code}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          {spaceCount} 個空間
                        </Badge>
                      </button>
                    </CollapsibleTrigger>

                    <div className="flex items-center gap-1 pl-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 gap-1 text-xs"
                        onClick={() => handleCreateSpaceOpen(building)}
                        title="在此大樓新增空間"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        新增空間
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleEditBuildingOpen(building)}
                        title="編輯大樓"
                      >
                        <Edit2 className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                        <span className="sr-only">編輯大樓</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => handleDeleteBuildingOpen(building)}
                        title="刪除大樓"
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">刪除大樓</span>
                      </Button>
                    </div>
                  </div>

                  <CollapsibleContent className="border-t bg-muted/20 p-4 pt-2">
                    {spaceCount === 0 ? (
                      <div className="my-2 flex h-20 items-center justify-center rounded-md border border-dashed text-muted-foreground text-xs">
                        此大樓目前無任何空間設定。
                      </div>
                    ) : (
                      <div className="mt-2 rounded-md border bg-background">
                        <Table>
                          <TableHeader>
                            <TableRow className="hover:bg-transparent">
                              <TableHead className="w-[100px]">樓層</TableHead>
                              <TableHead>空間名稱</TableHead>
                              <TableHead className="w-[120px] text-right">操作</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {building.spaces.map((space) => (
                              <TableRow key={space.id}>
                                <TableCell className="w-[100px] font-mono text-sm">
                                  <Badge variant="outline" className="font-normal">
                                    {space.floor > 0 ? `${space.floor}F` : `B${Math.abs(space.floor)}`}
                                  </Badge>
                                </TableCell>
                                <TableCell className="font-medium">
                                  <div className="flex items-center gap-2">
                                    <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                                    <span>{space.name}</span>
                                  </div>
                                </TableCell>
                                <TableCell className="w-[120px] text-right">
                                  <div className="flex items-center justify-end gap-1">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7"
                                      onClick={() => handleEditSpaceOpen(building, space)}
                                      title="編輯空間"
                                    >
                                      <Edit2 className="h-3.5 w-3.5" />
                                      <span className="sr-only">編輯空間</span>
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7 text-destructive hover:bg-destructive/10 hover:text-destructive"
                                      onClick={() => handleDeleteSpaceOpen(space)}
                                      title="刪除空間"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                      <span className="sr-only">刪除空間</span>
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CollapsibleContent>
                </Collapsible>
              );
            })}
          </div>
        )}
      </CardContent>

      <BuildingDialog
        open={buildingDialogOpen}
        onOpenChange={setBuildingDialogOpen}
        mode={buildingDialogMode}
        initialData={selectedBuilding ? { name: selectedBuilding.name, code: selectedBuilding.code } : null}
        onSubmit={handleBuildingSubmit}
      />

      <SpaceDialog
        open={spaceDialogOpen}
        onOpenChange={setSpaceDialogOpen}
        mode={spaceDialogMode}
        buildingName={targetBuildingForSpace?.name}
        initialData={selectedSpace ? { name: selectedSpace.name, floor: selectedSpace.floor } : null}
        onSubmit={handleSpaceSubmit}
      />

      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title={
          deleteTarget?.type === "building"
            ? `確定要刪除大樓「${deleteTarget.name}」？`
            : `確定要刪除空間「${deleteTarget?.name ?? ""}」？`
        }
        description={
          deleteTarget?.type === "building"
            ? "這將會移除此校園大樓記錄。若底下仍有所屬空間，系統將拒絕刪除。"
            : "這將會移除此空間記錄。若此空間曾被報修單或設備引用，系統將拒絕刪除。"
        }
        onConfirm={handleDeleteConfirm}
      />
    </Card>
  );
}
