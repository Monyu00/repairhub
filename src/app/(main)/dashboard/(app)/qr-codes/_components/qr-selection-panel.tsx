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
import type { LocationCatalogBuilding } from "@/lib/locations";

import type { EquipmentOption, QRTargetType } from "./types";

interface QRSelectionPanelProps {
  targetType: QRTargetType;
  buildings: LocationCatalogBuilding[];
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
        <div className="text-muted-foreground py-12 text-center text-sm">
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
            <div key={building.id} className="border-border/70 bg-background/50 overflow-hidden rounded-lg border">
              {/* Building Group Header */}
              <div className="bg-muted/40 flex items-center justify-between px-3 py-2">
                <div className="flex items-center gap-2.5">
                  <Checkbox
                    id={`building-${building.id}`}
                    aria-label={`全選 ${building.name} 的所有空間`}
                    checked={getCheckboxState(isAllSelected, isSomeSelected)}
                    onCheckedChange={() => handleToggleBuilding(buildingSpaceIds)}
                  />
                  <button
                    type="button"
                    onClick={() => toggleBuildingCollapse(building.id)}
                    className="text-foreground hover:text-primary flex items-center gap-1.5 text-left text-xs font-medium"
                  >
                    <Building2 className="text-muted-foreground size-3.5" />
                    <span>{building.name}</span>
                    <span className="text-muted-foreground text-xs">({building.code})</span>
                  </button>
                </div>

                <div className="flex items-center gap-1.5">
                  <Badge variant="outline">{building.spaces.length} 間</Badge>
                  <button
                    type="button"
                    onClick={() => toggleBuildingCollapse(building.id)}
                    className="text-muted-foreground hover:text-foreground"
                    aria-label={isCollapsed ? "展開地點" : "收合地點"}
                  >
                    {isCollapsed ? <ChevronRight className="size-4" /> : <ChevronDown className="size-4" />}
                  </button>
                </div>
              </div>

              {/* Spaces Sub-list */}
              {!isCollapsed && (
                <div className="divide-border/40 divide-y p-1">
                  {building.spaces.map((space) => {
                    const isChecked = selectedIds.includes(space.id);
                    return (
                      <div
                        key={space.id}
                        className={`hover:bg-muted/50 flex items-center justify-between rounded-md px-3 py-1.5 transition-colors ${
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
                            className="cursor-pointer text-xs leading-none font-normal select-none"
                          >
                            {space.name}
                          </Label>
                        </div>
                        <span className="text-foreground/80 font-mono text-xs">{space.floor}F</span>
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
        <div className="text-muted-foreground py-12 text-center text-sm">
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
            <div key={building.id} className="border-border/70 bg-background/50 overflow-hidden rounded-lg border">
              {/* Building Group Header */}
              <div className="bg-muted/40 flex items-center justify-between px-3 py-2">
                <div className="flex items-center gap-2.5">
                  <Checkbox
                    id={`eq-building-${building.id}`}
                    aria-label={`全選 ${building.name} 的所有設備`}
                    checked={getCheckboxState(isAllSelected, isSomeSelected)}
                    onCheckedChange={() => handleToggleBuilding(buildingEqIds)}
                  />
                  <button
                    type="button"
                    onClick={() => toggleBuildingCollapse(building.id)}
                    className="text-foreground hover:text-primary flex items-center gap-1.5 text-left text-xs font-medium"
                  >
                    <Building2 className="text-muted-foreground size-3.5" />
                    <span>{building.name}</span>
                  </button>
                </div>

                <div className="flex items-center gap-1.5">
                  <Badge variant="outline">{building.items.length} 台</Badge>
                  <button
                    type="button"
                    onClick={() => toggleBuildingCollapse(building.id)}
                    className="text-muted-foreground hover:text-foreground"
                    aria-label={isCollapsed ? "展開地點" : "收合地點"}
                  >
                    {isCollapsed ? <ChevronRight className="size-4" /> : <ChevronDown className="size-4" />}
                  </button>
                </div>
              </div>

              {/* Equipment Sub-list */}
              {!isCollapsed && (
                <div className="divide-border/40 divide-y p-1">
                  {building.items.map((eq) => {
                    const isChecked = selectedIds.includes(eq.id);
                    return (
                      <div
                        key={eq.id}
                        className={`hover:bg-muted/50 flex items-center justify-between rounded-md px-3 py-1.5 transition-colors ${
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
                            className="cursor-pointer truncate text-xs leading-none font-normal select-none"
                          >
                            {eq.name}
                          </Label>
                        </div>
                        <div className="flex shrink-0 items-center gap-1.5 text-right">
                          <span className="text-muted-foreground max-w-[100px] truncate text-xs">{eq.spaceName}</span>
                          <span className="text-foreground/80 font-mono text-xs">({eq.code})</span>
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
    <Card className="border-border bg-card flex h-full flex-col overflow-hidden border shadow-xs">
      {/* Search and Header Controls */}
      <div className="border-border/80 space-y-3 border-b p-3.5 sm:p-4">
        <div className="relative">
          <Search className="text-muted-foreground absolute top-2.5 left-2.5 size-4" />
          <Input
            type="text"
            placeholder={targetType === "spaces" ? "搜尋地點名稱、空間名稱或樓層..." : "搜尋設備名稱、編號或空間..."}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pr-8 pl-8.5 text-sm"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm("")}
              className="text-muted-foreground hover:text-foreground absolute top-2.5 right-2.5"
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
              <Button variant="ghost" size="xs" onClick={onClearAll} className="text-muted-foreground h-7 text-xs">
                全部清除
              </Button>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <Badge variant="secondary">
              已選 <span className="text-primary mr-0.5 ml-1 font-semibold">{selectedIds.length}</span> 項
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
