"use client";

import { useEffect, useMemo, useState } from "react";

import { Download, Layers, Package, QrCode } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { QRCard } from "./qr-card";
import { exportQRCodesToPDF } from "./qr-pdf-export";
import { QRSelectionPanel } from "./qr-selection-panel";
import type { BuildingOption, EquipmentOption, PrintableQRItem, QRTargetType } from "./types";

interface QRCodeDashboardProps {
  buildings: BuildingOption[];
  equipment: EquipmentOption[];
}

export function QRCodeDashboard({ buildings, equipment }: QRCodeDashboardProps) {
  const [targetType, setTargetType] = useState<QRTargetType>("spaces");
  const [selectedSpaceIds, setSelectedSpaceIds] = useState<string[]>([]);
  const [selectedEquipmentIds, setSelectedEquipmentIds] = useState<string[]>([]);
  const [origin, setOrigin] = useState<string>("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setOrigin(window.location.origin);
    }
  }, []);

  // Pre-select all spaces on initial load for convenient batch export
  useEffect(() => {
    const allSpaceIds = buildings.flatMap((b) => b.spaces.map((s) => s.id));
    setSelectedSpaceIds(allSpaceIds);

    const allEqIds = equipment.map((eq) => eq.id);
    setSelectedEquipmentIds(allEqIds);
  }, [buildings, equipment]);

  // Lookup map for spaces with building info
  const spacesMap = useMemo(() => {
    const map = new Map<string, { spaceName: string; floor: number; buildingName: string; buildingCode: string }>();
    for (const b of buildings) {
      for (const s of b.spaces) {
        map.set(s.id, {
          spaceName: s.name,
          floor: s.floor,
          buildingName: b.name,
          buildingCode: b.code,
        });
      }
    }
    return map;
  }, [buildings]);

  // Lookup map for equipment
  const equipmentMap = useMemo(() => {
    const map = new Map<string, EquipmentOption>();
    for (const eq of equipment) {
      map.set(eq.id, eq);
    }
    return map;
  }, [equipment]);

  // Active selected IDs based on current target type
  const activeSelectedIds = targetType === "spaces" ? selectedSpaceIds : selectedEquipmentIds;

  const handleToggleItem = (id: string) => {
    if (targetType === "spaces") {
      setSelectedSpaceIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
    } else {
      setSelectedEquipmentIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
    }
  };

  const handleSelectAll = (ids: string[]) => {
    if (targetType === "spaces") {
      setSelectedSpaceIds(ids);
    } else {
      setSelectedEquipmentIds(ids);
    }
  };

  const handleClearAll = () => {
    if (targetType === "spaces") {
      setSelectedSpaceIds([]);
    } else {
      setSelectedEquipmentIds([]);
    }
  };

  // Convert active selection to PrintableQRItem[]
  const printableItems: PrintableQRItem[] = useMemo(() => {
    const base = origin || "";

    if (targetType === "spaces") {
      const items: PrintableQRItem[] = [];
      for (const id of selectedSpaceIds) {
        const info = spacesMap.get(id);
        if (info) {
          items.push({
            id,
            type: "space",
            title: info.spaceName,
            subtitle: `${info.buildingName} · ${info.floor}F`,
            buildingName: info.buildingName,
            spaceName: info.spaceName,
            url: `${base}/report?location_id=${id}`,
          });
        }
      }
      return items;
    }

    const items: PrintableQRItem[] = [];
    for (const id of selectedEquipmentIds) {
      const eq = equipmentMap.get(id);
      if (eq) {
        items.push({
          id,
          type: "equipment",
          title: eq.name,
          subtitle: `${eq.buildingName} · ${eq.spaceName}`,
          code: eq.code,
          buildingName: eq.buildingName,
          spaceName: eq.spaceName,
          url: `${base}/report?equipment_id=${id}`,
        });
      }
    }
    return items;
  }, [targetType, selectedSpaceIds, selectedEquipmentIds, spacesMap, equipmentMap, origin]);

  const handleExportPDF = async () => {
    const prefix = targetType === "spaces" ? "RepairHub_空間報修QR" : "RepairHub_設備報修QR";
    await exportQRCodesToPDF(printableItems, prefix);
  };

  const totalAvailableSpaces = useMemo(() => buildings.reduce((acc, b) => acc + b.spaces.length, 0), [buildings]);
  const totalAvailableEquipment = equipment.length;

  return (
    <div className="space-y-6">
      {/* Header & Action Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-bold text-2xl text-foreground tracking-tight">批量 QR Code 產生</h1>
          <p className="text-muted-foreground text-sm">全校空間地點與設備資產報修條碼批量產生、即時預覽與 PDF 下載。</p>
        </div>

        {/* Global Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="default"
            size="sm"
            onClick={handleExportPDF}
            disabled={printableItems.length === 0}
            className="h-9 gap-1.5"
          >
            <Download className="size-4" />
            <span>下載 PDF ({printableItems.length})</span>
          </Button>
        </div>
      </div>

      {/* Tabs Selector */}
      <div>
        <Tabs value={targetType} onValueChange={(val) => setTargetType(val as QRTargetType)} className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="spaces" className="gap-1.5 text-xs sm:text-sm">
              <Layers className="size-4" />
              <span>
                空間 QR Code ({selectedSpaceIds.length}/{totalAvailableSpaces})
              </span>
            </TabsTrigger>
            <TabsTrigger value="equipment" className="gap-1.5 text-xs sm:text-sm">
              <Package className="size-4" />
              <span>
                設備 QR Code ({selectedEquipmentIds.length}/{totalAvailableEquipment})
              </span>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column: Selection Panel */}
        <div className="lg:col-span-4 xl:col-span-4">
          <div className="sticky top-16 h-[calc(100vh-12rem)] min-h-[480px]">
            <QRSelectionPanel
              targetType={targetType}
              buildings={buildings}
              equipment={equipment}
              selectedIds={activeSelectedIds}
              onToggleItem={handleToggleItem}
              onSelectAll={handleSelectAll}
              onClearAll={handleClearAll}
            />
          </div>
        </div>

        {/* Right Column: Live Preview Grid */}
        <div className="lg:col-span-8 xl:col-span-8">
          {printableItems.length === 0 ? (
            <Card className="flex min-h-[480px] items-center justify-center border-dashed p-8 text-center">
              <Empty className="max-w-md">
                <EmptyMedia variant="icon">
                  <QrCode className="size-6" />
                </EmptyMedia>
                <EmptyHeader>
                  <EmptyTitle>尚未選取任何項目</EmptyTitle>
                  <EmptyDescription>
                    請由左側面板勾選欲產生 QR Code 的{targetType === "spaces" ? "空間" : "設備"}
                    ，選取後將在此處即時產生卡片預覽。
                  </EmptyDescription>
                </EmptyHeader>
                <EmptyContent>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (targetType === "spaces") {
                        setSelectedSpaceIds(buildings.flatMap((b) => b.spaces.map((s) => s.id)));
                      } else {
                        setSelectedEquipmentIds(equipment.map((eq) => eq.id));
                      }
                    }}
                  >
                    選取全部{targetType === "spaces" ? "空間" : "設備"}
                  </Button>
                </EmptyContent>
              </Empty>
            </Card>
          ) : (
            <div className="space-y-4">
              {/* Preview Toolbar */}
              <div className="flex items-center justify-between rounded-lg border border-border/80 bg-muted/40 px-4 py-2.5">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-foreground text-sm">即時預覽</span>
                  <Badge variant="secondary" className="px-2 py-0 text-xs">
                    共 {printableItems.length} 張卡片
                  </Badge>
                </div>
                <span className="text-muted-foreground text-xs">支援單張下載卡片圖片或批量下載 PDF</span>
              </div>

              {/* Cards Grid */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {printableItems.map((item) => (
                  <QRCard key={`${item.type}-${item.id}`} item={item} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
