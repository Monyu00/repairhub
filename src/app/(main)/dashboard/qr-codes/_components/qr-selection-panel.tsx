"use client";

import { useMemo, useState } from "react";

import { Building2, CheckSquare, ChevronDown, ChevronRight, Layers, Package, Search, Square, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";

import type { BuildingOption, EquipmentOption, QRTargetType } from "./types";

interface QRSelectionPanelProps {
  targetType: QRTargetType;
  buildings: BuildingOption[];
  equipment: EquipmentOption[];
  selectedIds: string[];
  onToggleItem: (id: string) => void;
  onSelectAll: (ids: string[]) => void;
  onClearAll: () => void;
}

function getCheckboxState(isAll: boolean, isSome: boolean): boolean | "indeterminate" {
  if (isAll) return true;
  if (isSome) return "indeterminate";
  return false;
}

export function QRSelectionPanel({
  targetType,
  buildings,
  equipment,
  selectedIds,
  onToggleItem,
  onSelectAll,
  onClearAll,
}: QRSelectionPanelProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [collapsedBuildings, setCollapsedBuildings] = useState<Record<string, boolean>>({});

  const toggleBuildingCollapse = (buildingId: string) => {
    setCollapsedBuildings((prev) => ({
      ...prev,
      [buildingId]: !prev[buildingId],
    }));
  };

  // Filtered Spaces Grouped by Building
  const filteredSpacesByBuilding = useMemo(() => {
    if (targetType !== "spaces") return [];
    const query = searchTerm.trim().toLowerCase();

    return buildings
      .map((b) => {
        const matchesBuilding = b.name.toLowerCase().includes(query) || b.code.toLowerCase().includes(query);
        const filteredSpaces = b.spaces.filter((s) => {
          if (!query) return true;
          if (matchesBuilding) return true;
          return (
            s.name.toLowerCase().includes(query) || `${s.floor}f`.includes(query) || `${s.floor}樓`.includes(query)
          );
        });

        return {
          ...b,
          spaces: filteredSpaces,
        };
      })
      .filter((b) => b.spaces.length > 0);
  }, [buildings, targetType, searchTerm]);

  // Filtered Equipment Grouped by Building
  const filteredEquipmentByBuilding = useMemo(() => {
    if (targetType !== "equipment") return [];
    const query = searchTerm.trim().toLowerCase();

    const buildingMap: Record<
      string,
      {
        id: string;
        name: string;
        code: string;
        items: EquipmentOption[];
      }
    > = {};

    for (const b of buildings) {
      buildingMap[b.id] = {
        id: b.id,
        name: b.name,
        code: b.code,
        items: [],
      };
    }

    for (const eq of equipment) {
      const bId = eq.buildingId;
      if (!buildingMap[bId]) {
        buildingMap[bId] = {
          id: bId,
          name: eq.buildingName,
          code: "",
          items: [],
        };
      }

      if (!query) {
        buildingMap[bId].items.push(eq);
      } else {
        const matches =
          eq.name.toLowerCase().includes(query) ||
          eq.code.toLowerCase().includes(query) ||
          eq.spaceName.toLowerCase().includes(query) ||
          eq.buildingName.toLowerCase().includes(query);

        if (matches) {
          buildingMap[bId].items.push(eq);
        }
      }
    }

    return Object.values(buildingMap).filter((b) => b.items.length > 0);
  }, [buildings, equipment, targetType, searchTerm]);

  // All visible IDs for "Select All visible"
  const visibleItemIds = useMemo(() => {
    if (targetType === "spaces") {
      return filteredSpacesByBuilding.flatMap((b) => b.spaces.map((s) => s.id));
    }
    return filteredEquipmentByBuilding.flatMap((b) => b.items.map((eq) => eq.id));
  }, [targetType, filteredSpacesByBuilding, filteredEquipmentByBuilding]);

  const allVisibleSelected = visibleItemIds.length > 0 && visibleItemIds.every((id) => selectedIds.includes(id));

  // Toggle all items in a building
  const handleToggleBuilding = (buildingItemIds: string[]) => {
    const allInBuildingSelected = buildingItemIds.every((id) => selectedIds.includes(id));
    if (allInBuildingSelected) {
      const newSelected = selectedIds.filter((id) => !buildingItemIds.includes(id));
      onSelectAll(newSelected);
    } else {
      const toAdd = buildingItemIds.filter((id) => !selectedIds.includes(id));
      onSelectAll([...selectedIds, ...toAdd]);
    }
  };

  const renderSpacesContent = () => {
    if (filteredSpacesByBuilding.length === 0) {
      return (
        <div className="py-12 text-center text-muted-foreground text-sm">
          <Layers className="mx-auto mb-2 size-8 opacity-40" />
          無符合條件的空間
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {filteredSpacesByBuilding.map((building) => {
          const buildingSpaceIds = building.spaces.map((s) => s.id);
          const isAllSelected = buildingSpaceIds.length > 0 && buildingSpaceIds.every((id) => selectedIds.includes(id));
          const isSomeSelected = !isAllSelected && buildingSpaceIds.some((id) => selectedIds.includes(id));
          const isCollapsed = collapsedBuildings[building.id] ?? false;

          return (
            <div key={building.id} className="overflow-hidden rounded-lg border border-border/70 bg-background/50">
              {/* Building Group Header */}
              <div className="flex items-center justify-between bg-muted/40 px-3 py-2">
                <div className="flex items-center gap-2.5">
                  <Checkbox
                    id={`building-${building.id}`}
                    checked={getCheckboxState(isAllSelected, isSomeSelected)}
                    onCheckedChange={() => handleToggleBuilding(buildingSpaceIds)}
                  />
                  <button
                    type="button"
                    onClick={() => toggleBuildingCollapse(building.id)}
                    className="flex items-center gap-1.5 text-left font-medium text-foreground text-xs hover:text-primary"
                  >
                    <Building2 className="size-3.5 text-muted-foreground" />
                    <span>{building.name}</span>
                    <span className="text-[11px] text-muted-foreground">({building.code})</span>
                  </button>
                </div>

                <div className="flex items-center gap-1.5">
                  <Badge variant="outline" className="px-1.5 py-0 text-[10px]">
                    {building.spaces.length} 間
                  </Badge>
                  <button
                    type="button"
                    onClick={() => toggleBuildingCollapse(building.id)}
                    className="text-muted-foreground hover:text-foreground"
                    aria-label={isCollapsed ? "展開大樓" : "收合大樓"}
                  >
                    {isCollapsed ? <ChevronRight className="size-4" /> : <ChevronDown className="size-4" />}
                  </button>
                </div>
              </div>

              {/* Spaces Sub-list */}
              {!isCollapsed && (
                <div className="divide-y divide-border/40 p-1">
                  {building.spaces.map((space) => {
                    const isChecked = selectedIds.includes(space.id);
                    return (
                      <div
                        key={space.id}
                        className={`flex items-center justify-between rounded-md px-3 py-1.5 transition-colors hover:bg-muted/50 ${
                          isChecked ? "bg-primary/5" : ""
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <Checkbox
                            id={`space-${space.id}`}
                            checked={isChecked}
                            onCheckedChange={() => onToggleItem(space.id)}
                          />
                          <Label
                            htmlFor={`space-${space.id}`}
                            className="cursor-pointer select-none font-normal text-xs leading-none"
                          >
                            {space.name}
                          </Label>
                        </div>
                        <span className="font-mono text-[11px] text-muted-foreground">{space.floor}F</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const renderEquipmentContent = () => {
    if (filteredEquipmentByBuilding.length === 0) {
      return (
        <div className="py-12 text-center text-muted-foreground text-sm">
          <Package className="mx-auto mb-2 size-8 opacity-40" />
          無符合條件的設備
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {filteredEquipmentByBuilding.map((building) => {
          const buildingEqIds = building.items.map((eq) => eq.id);
          const isAllSelected = buildingEqIds.length > 0 && buildingEqIds.every((id) => selectedIds.includes(id));
          const isSomeSelected = !isAllSelected && buildingEqIds.some((id) => selectedIds.includes(id));
          const isCollapsed = collapsedBuildings[building.id] ?? false;

          return (
            <div key={building.id} className="overflow-hidden rounded-lg border border-border/70 bg-background/50">
              {/* Building Group Header */}
              <div className="flex items-center justify-between bg-muted/40 px-3 py-2">
                <div className="flex items-center gap-2.5">
                  <Checkbox
                    id={`eq-building-${building.id}`}
                    checked={getCheckboxState(isAllSelected, isSomeSelected)}
                    onCheckedChange={() => handleToggleBuilding(buildingEqIds)}
                  />
                  <button
                    type="button"
                    onClick={() => toggleBuildingCollapse(building.id)}
                    className="flex items-center gap-1.5 text-left font-medium text-foreground text-xs hover:text-primary"
                  >
                    <Building2 className="size-3.5 text-muted-foreground" />
                    <span>{building.name}</span>
                  </button>
                </div>

                <div className="flex items-center gap-1.5">
                  <Badge variant="outline" className="px-1.5 py-0 text-[10px]">
                    {building.items.length} 台
                  </Badge>
                  <button
                    type="button"
                    onClick={() => toggleBuildingCollapse(building.id)}
                    className="text-muted-foreground hover:text-foreground"
                    aria-label={isCollapsed ? "展開大樓" : "收合大樓"}
                  >
                    {isCollapsed ? <ChevronRight className="size-4" /> : <ChevronDown className="size-4" />}
                  </button>
                </div>
              </div>

              {/* Equipment Sub-list */}
              {!isCollapsed && (
                <div className="divide-y divide-border/40 p-1">
                  {building.items.map((eq) => {
                    const isChecked = selectedIds.includes(eq.id);
                    return (
                      <div
                        key={eq.id}
                        className={`flex items-center justify-between rounded-md px-3 py-1.5 transition-colors hover:bg-muted/50 ${
                          isChecked ? "bg-primary/5" : ""
                        }`}
                      >
                        <div className="flex min-w-0 items-center gap-2.5">
                          <Checkbox
                            id={`eq-${eq.id}`}
                            checked={isChecked}
                            onCheckedChange={() => onToggleItem(eq.id)}
                          />
                          <Label
                            htmlFor={`eq-${eq.id}`}
                            className="cursor-pointer truncate select-none font-normal text-xs leading-none"
                          >
                            {eq.name}
                          </Label>
                        </div>
                        <div className="flex shrink-0 items-center gap-1.5 text-right">
                          <span className="max-w-[100px] truncate text-[10px] text-muted-foreground">
                            {eq.spaceName}
                          </span>
                          <span className="font-mono text-[10px] text-muted-foreground/80">({eq.code})</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <Card className="flex h-full flex-col overflow-hidden border border-border bg-card shadow-xs">
      {/* Search and Header Controls */}
      <div className="space-y-3 border-b border-border/80 p-3.5 sm:p-4">
        <div className="relative">
          <Search className="absolute top-2.5 left-2.5 size-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder={targetType === "spaces" ? "搜尋大樓名稱、空間名稱或樓層..." : "搜尋設備名稱、編號或空間..."}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8.5 pr-8 text-sm"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm("")}
              className="absolute top-2.5 right-2.5 text-muted-foreground hover:text-foreground"
              aria-label="清除搜尋"
            >
              <X className="size-4" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="xs"
              onClick={() => {
                if (allVisibleSelected) {
                  onSelectAll(selectedIds.filter((id) => !visibleItemIds.includes(id)));
                } else {
                  const unique = Array.from(new Set([...selectedIds, ...visibleItemIds]));
                  onSelectAll(unique);
                }
              }}
              className="h-7 text-xs font-normal"
            >
              {allVisibleSelected ? (
                <>
                  <Square className="mr-1 size-3.5" />
                  取消全選
                </>
              ) : (
                <>
                  <CheckSquare className="mr-1 size-3.5" />
                  全選 ({visibleItemIds.length})
                </>
              )}
            </Button>

            {selectedIds.length > 0 && (
              <Button variant="ghost" size="xs" onClick={onClearAll} className="h-7 text-xs text-muted-foreground">
                全部清除
              </Button>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <Badge variant="secondary" className="px-2 py-0.5 text-xs font-normal">
              已選 <span className="ml-1 mr-0.5 font-semibold text-primary">{selectedIds.length}</span> 項
            </Badge>
          </div>
        </div>
      </div>

      {/* Tree / Grouped List of Items */}
      <ScrollArea className="flex-1 p-3">
        {targetType === "spaces" ? renderSpacesContent() : renderEquipmentContent()}
      </ScrollArea>
    </Card>
  );
}
