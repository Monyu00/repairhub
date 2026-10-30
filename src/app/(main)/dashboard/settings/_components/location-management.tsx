"use client";

import { useMemo, useState, useTransition } from "react";

import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import {
  Building2,
  ChevronDown,
  ChevronRight,
  ChevronsDown,
  ChevronsUp,
  Edit2,
  FilterX,
  GripVertical,
  MapPin,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Empty, EmptyDescription, EmptyHeader } from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

import {
  type BuildingWithSpaces,
  createBuilding,
  createSpace,
  deleteBuilding,
  deleteSpace,
  reorderBuildings,
  reorderSpaces,
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

interface SortableBuildingCardProps {
  building: BuildingWithSpaces;
  isOpen: boolean;
  isSearching: boolean;
  isPending: boolean;
  onToggleOpen: () => void;
  onAddSpace: () => void;
  onEditBuilding: () => void;
  onDeleteBuilding: () => void;
  onEditSpace: (space: SpaceItem) => void;
  onDeleteSpace: (space: SpaceItem) => void;
  onReorderSpaces: (event: DragEndEvent) => void;
}

interface SortableSpaceRowProps {
  space: SpaceItem;
  isDisabled: boolean;
  onEdit: () => void;
  onDelete: () => void;
}

function SortableSpaceRow({ space, isDisabled, onEdit, onDelete }: SortableSpaceRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: space.id,
    disabled: isDisabled,
  });

  const style: React.CSSProperties = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    transition,
  };

  return (
    <TableRow ref={setNodeRef} style={style} className={cn(isDragging && "relative z-10 bg-muted opacity-60")}>
      <TableCell className="w-[120px] font-mono text-sm">
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="size-11 cursor-grab touch-none text-muted-foreground hover:text-foreground active:cursor-grabbing sm:size-8"
            {...attributes}
            {...listeners}
            disabled={isDisabled}
            title={isDisabled ? "清除搜尋後可調整順序" : "拖拉調整空間順序"}
          >
            <GripVertical />
            <span className="sr-only">拖拉調整空間順序</span>
          </Button>
          <Badge variant="outline" className="font-normal">
            {space.floor > 0 ? `${space.floor}F` : `B${Math.abs(space.floor)}`}
          </Badge>
        </div>
      </TableCell>
      <TableCell className="font-medium">
        <div className="flex items-center gap-2">
          <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
          <span>{space.name}</span>
        </div>
      </TableCell>
      <TableCell className="w-[120px] text-right">
        <div className="flex items-center justify-end gap-1">
          <Button variant="ghost" size="icon" className="size-11 sm:size-8" onClick={onEdit} title="編輯空間">
            <Edit2 />
            <span className="sr-only">編輯空間</span>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-11 text-destructive hover:bg-destructive/10 hover:text-destructive sm:size-8"
            onClick={onDelete}
            title="刪除空間"
          >
            <Trash2 />
            <span className="sr-only">刪除空間</span>
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

function SortableBuildingCard({
  building,
  isOpen,
  isSearching,
  isPending,
  onToggleOpen,
  onAddSpace,
  onEditBuilding,
  onDeleteBuilding,
  onEditSpace,
  onDeleteSpace,
  onReorderSpaces,
}: SortableBuildingCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: building.id,
    disabled: isSearching || isPending,
  });
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 4,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const style: React.CSSProperties = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    transition,
  };
  const spaceCount = building.spaces.length;

  return (
    <div ref={setNodeRef} style={style} className={cn(isDragging && "relative z-10 opacity-60")}>
      <Collapsible
        open={isOpen}
        onOpenChange={onToggleOpen}
        className="rounded-lg border border-border bg-card shadow-xs transition-colors"
      >
        <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="size-11 cursor-grab touch-none text-muted-foreground hover:text-foreground active:cursor-grabbing sm:size-8"
              {...attributes}
              {...listeners}
              disabled={isSearching || isPending}
              title={isSearching ? "清除搜尋後可調整順序" : "拖拉調整地點順序"}
            >
              <GripVertical />
              <span className="sr-only">拖拉調整地點順序</span>
            </Button>

            <CollapsibleTrigger asChild>
              <button
                type="button"
                className="flex min-w-0 flex-1 items-center gap-3 text-left font-medium hover:text-primary focus-visible:outline-hidden"
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
          </div>

          <div className="flex items-center justify-end gap-1 sm:pl-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-11 gap-1 px-3 text-xs sm:h-8 sm:px-2"
              onClick={onAddSpace}
              title="在此地點新增空間"
            >
              <Plus />
              新增空間
            </Button>
            <Button variant="ghost" size="icon" className="size-11 sm:size-8" onClick={onEditBuilding} title="編輯地點">
              <Edit2 />
              <span className="sr-only">編輯地點</span>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-11 text-destructive hover:bg-destructive/10 hover:text-destructive sm:size-8"
              onClick={onDeleteBuilding}
              title="刪除地點"
            >
              <Trash2 />
              <span className="sr-only">刪除地點</span>
            </Button>
          </div>
        </div>

        <CollapsibleContent className="border-t bg-muted/20 p-4 pt-2">
          {spaceCount === 0 ? (
            <Empty className="my-2 border border-dashed py-6">
              <EmptyHeader>
                <EmptyDescription>此地點目前無任何空間設定。</EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <div className="mt-2 rounded-md border bg-background">
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                modifiers={[restrictToVerticalAxis]}
                onDragEnd={onReorderSpaces}
              >
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="w-[120px]">排序 / 樓層</TableHead>
                      <TableHead>空間名稱</TableHead>
                      <TableHead className="w-[120px] text-right">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <SortableContext
                      items={building.spaces.map((space) => space.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      {building.spaces.map((space) => (
                        <SortableSpaceRow
                          key={space.id}
                          space={space}
                          isDisabled={isSearching || isPending}
                          onEdit={() => onEditSpace(space)}
                          onDelete={() => onDeleteSpace(space)}
                        />
                      ))}
                    </SortableContext>
                  </TableBody>
                </Table>
              </DndContext>
            </div>
          )}
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

export function LocationManagement({ initialBuildings }: LocationManagementProps) {
  const [buildings, setBuildings] = useState<BuildingWithSpaces[]>(initialBuildings);
  const [isPending, startTransition] = useTransition();

  // Search State
  const [searchQuery, setSearchQuery] = useState("");
  const [closedInSearch, setClosedInSearch] = useState<string[]>([]);

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
  if (initialBuildings !== buildings && !isPending) {
    setBuildings(initialBuildings);
  }

  const isSearching = Boolean(searchQuery.trim());
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 4,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    setClosedInSearch([]);
  };

  const handleExpandAll = () => {
    if (isSearching) {
      setClosedInSearch([]);
      return;
    }

    setOpenBuildingIds(buildings.map((building) => building.id));
  };

  const handleCollapseAll = () => {
    if (isSearching) {
      setClosedInSearch(filteredBuildings.map((building) => building.id));
      return;
    }

    setOpenBuildingIds([]);
  };

  const toggleBuildingOpen = (id: string) => {
    if (isSearching) {
      setClosedInSearch((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
    } else {
      setOpenBuildingIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
    }
  };

  const isBuildingOpen = (id: string) => {
    if (isSearching) {
      return !closedInSearch.includes(id);
    }
    return openBuildingIds.includes(id);
  };

  const filteredBuildings = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return buildings;

    return buildings
      .map((b) => {
        const matchBuilding = b.name.toLowerCase().includes(q) || b.code.toLowerCase().includes(q);
        const matchedSpaces = (b.spaces || []).filter((s) => {
          const floorStr = s.floor > 0 ? `${s.floor}f` : `b${Math.abs(s.floor)}`;
          return s.name.toLowerCase().includes(q) || floorStr.includes(q) || String(s.floor).includes(q);
        });

        if (matchBuilding) {
          return b;
        }

        if (matchedSpaces.length > 0) {
          return {
            ...b,
            spaces: matchedSpaces,
          };
        }

        return null;
      })
      .filter((b): b is BuildingWithSpaces => b !== null);
  }, [buildings, searchQuery]);

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
        toast.success("地點新增成功");
      }
      return res;
    }

    if (buildingDialogMode === "edit" && selectedBuilding) {
      const res = await updateBuilding(selectedBuilding.id, name, code);
      if (res.success) {
        toast.success("地點資訊已更新");
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
        toast.success(`已成功刪除地點「${deleteTarget.name}」`);
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

  const handleBuildingDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (isSearching || !over || active.id === over.id) return;

    const oldIndex = buildings.findIndex((building) => building.id === active.id);
    const newIndex = buildings.findIndex((building) => building.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    const nextBuildings = arrayMove(buildings, oldIndex, newIndex);
    setBuildings(nextBuildings);

    startTransition(async () => {
      const res = await reorderBuildings(nextBuildings.map((building) => building.id));
      if (!res.success) {
        toast.error(res.error ?? "調整地點排序失敗");
        setBuildings(initialBuildings);
      } else {
        toast.success("地點排序已更新");
      }
    });
  };

  const handleSpaceDragEnd = (buildingId: string, event: DragEndEvent) => {
    const { active, over } = event;

    if (isSearching || !over || active.id === over.id) return;

    const building = buildings.find((item) => item.id === buildingId);
    if (!building) return;

    const oldIndex = building.spaces.findIndex((space) => space.id === active.id);
    const newIndex = building.spaces.findIndex((space) => space.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    const nextSpaces = arrayMove(building.spaces, oldIndex, newIndex);
    setBuildings((prev) => prev.map((item) => (item.id === buildingId ? { ...item, spaces: nextSpaces } : item)));

    startTransition(async () => {
      const res = await reorderSpaces(
        buildingId,
        nextSpaces.map((space) => space.id),
      );
      if (!res.success) {
        toast.error(res.error ?? "調整空間排序失敗");
        setBuildings(initialBuildings);
      } else {
        toast.success("空間排序已更新");
      }
    });
  };

  return (
    <Card className="border-border/60 shadow-xs">
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className="text-xl">校園地點與空間管理</CardTitle>
          <CardDescription className="mt-1 text-muted-foreground text-sm">
            維護全校地點與其所屬空間層級結構。可拖曳調整顯示順序，刪除前系統會自動檢查相關報修單與設備關聯。
          </CardDescription>
        </div>
        <CardAction className="w-full sm:w-auto">
          <Button onClick={handleCreateBuildingOpen} className="h-11 w-full shrink-0 gap-1.5 sm:h-8 sm:w-auto">
            <Plus className="h-4 w-4" />
            新增地點
          </Button>
        </CardAction>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        {/* Search Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card/60 p-3.5 shadow-xs backdrop-blur-xs">
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative w-full sm:w-64">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                placeholder="搜尋地點名稱、代碼或空間..."
                aria-label="搜尋地點名稱、代碼或空間"
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="h-8 pl-8 text-xs"
              />
            </div>

            {searchQuery && (
              <Button
                variant="ghost"
                size="sm"
                className="h-11 gap-1 px-3 text-muted-foreground text-xs hover:text-foreground sm:h-8 sm:px-2"
                onClick={() => handleSearchChange("")}
              >
                <FilterX className="size-3.5" />
                <span>清除搜尋</span>
              </Button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="text-muted-foreground text-xs">
              共 <span className="font-semibold text-foreground">{filteredBuildings.length}</span> 個地點
              {searchQuery && (
                <span className="ml-1">
                  （含{" "}
                  <span className="font-semibold text-foreground">
                    {filteredBuildings.reduce((acc, b) => acc + (b.spaces?.length ?? 0), 0)}
                  </span>{" "}
                  個空間）
                </span>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              className="h-11 sm:h-8"
              onClick={handleExpandAll}
              disabled={filteredBuildings.length === 0}
            >
              <ChevronsDown data-icon="inline-start" />
              全部展開
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-11 sm:h-8"
              onClick={handleCollapseAll}
              disabled={filteredBuildings.length === 0}
            >
              <ChevronsUp data-icon="inline-start" />
              全部摺疊
            </Button>
          </div>
        </div>

        {filteredBuildings.length === 0 ? (
          <Empty className="border border-dashed bg-card/40 py-10">
            <EmptyHeader>
              <EmptyDescription>
                {buildings.length === 0
                  ? "目前尚未建立任何校園地點。"
                  : "找不到符合條件的地點或空間。請嘗試其他關鍵字。"}
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            modifiers={[restrictToVerticalAxis]}
            onDragEnd={handleBuildingDragEnd}
          >
            <SortableContext
              items={filteredBuildings.map((building) => building.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="flex flex-col gap-3">
                {filteredBuildings.map((building) => (
                  <SortableBuildingCard
                    key={building.id}
                    building={building}
                    isOpen={isBuildingOpen(building.id)}
                    isSearching={isSearching}
                    isPending={isPending}
                    onToggleOpen={() => toggleBuildingOpen(building.id)}
                    onAddSpace={() => handleCreateSpaceOpen(building)}
                    onEditBuilding={() => handleEditBuildingOpen(building)}
                    onDeleteBuilding={() => handleDeleteBuildingOpen(building)}
                    onEditSpace={(space) => handleEditSpaceOpen(building, space)}
                    onDeleteSpace={handleDeleteSpaceOpen}
                    onReorderSpaces={(event) => handleSpaceDragEnd(building.id, event)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
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
            ? `確定要刪除地點「${deleteTarget.name}」？`
            : `確定要刪除空間「${deleteTarget?.name ?? ""}」？`
        }
        description={
          deleteTarget?.type === "building"
            ? "這將會移除此校園地點記錄。若底下仍有所屬空間，系統將拒絕刪除。"
            : "這將會移除此空間記錄。若此空間曾被報修單或設備引用，系統將拒絕刪除。"
        }
        onConfirm={handleDeleteConfirm}
      />
    </Card>
  );
}
