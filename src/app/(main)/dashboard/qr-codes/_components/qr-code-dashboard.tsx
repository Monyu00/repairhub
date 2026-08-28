"use client";

import { useEffect, useMemo, useState } from "react";

import { Download, QrCode } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";

import { QRCard } from "./qr-card";
import { exportQRCodesToPDF } from "./qr-pdf-export";
import { QRSelectionPanel } from "./qr-selection-panel";
import type { BuildingOption, EquipmentOption, PrintableQRItem, QRTargetType } from "./types";

interface QRCodeDashboardProps {
  buildings: BuildingOption[];
  equipment: EquipmentOption[];
  defaultTab?: string;
}

export function QRCodeDashboard({ buildings, equipment, defaultTab }: QRCodeDashboardProps) {
  const targetType: QRTargetType = defaultTab === "equipment" ? "equipment" : "spaces";
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

  // Handle selection toggles
  const handleToggleItem = (id: string) => {
    if (targetType === "spaces") {
      setSelectedSpaceIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
    } else {
      setSelectedEquipmentIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
    }
  };

  const handleSelectAll = () => {
    if (targetType === "spaces") {
      const allSpaceIds = buildings.flatMap((b) => b.spaces.map((s) => s.id));
      setSelectedSpaceIds(allSpaceIds);
    } else {
      const allEqIds = equipment.map((eq) => eq.id);
      setSelectedEquipmentIds(allEqIds);
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
    if (!origin) return [];

    if (targetType === "spaces") {
      const items: PrintableQRItem[] = [];
      for (const spaceId of selectedSpaceIds) {
        const info = spacesMap.get(spaceId);
        if (!info) continue;
        items.push({
          id: spaceId,
          type: "space",
          title: `${info.buildingName} ${info.spaceName}`,
          subtitle: `${info.floor >= 0 ? `${info.floor}F` : `B${Math.abs(info.floor)}`} - ${info.spaceName}`,
          code: `${info.buildingCode}-${info.spaceName}`,
          buildingName: info.buildingName,
          spaceName: info.spaceName,
          url: `${origin}/report?space_id=${spaceId}`,
        });
      }
      return items;
    }

    const items: PrintableQRItem[] = [];
    for (const eqId of selectedEquipmentIds) {
      const eq = equipment.find((e) => e.id === eqId);
      if (!eq) continue;
      items.push({
        id: eq.id,
        type: "equipment",
        title: eq.name,
        subtitle: `${eq.buildingName} - ${eq.spaceName}`,
        code: eq.code || eq.name,
        buildingName: eq.buildingName,
        spaceName: eq.spaceName,
        url: `${origin}/report?space_id=${eq.spaceId}&equipment_id=${eq.id}`,
      });
    }
    return items;
  }, [targetType, selectedSpaceIds, selectedEquipmentIds, spacesMap, equipment, origin]);

  // Export PDF
  const handleExportPDF = async () => {
    if (printableItems.length === 0) return;
    const prefix = targetType === "spaces" ? "空間" : "設備";
    await exportQRCodesToPDF(printableItems, prefix);
  };

  const activeSelectedIds = targetType === "spaces" ? selectedSpaceIds : selectedEquipmentIds;

  return (
    <div className="space-y-6">
      {/* Header & Action Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-bold text-2xl text-foreground tracking-tight">
            {targetType === "spaces" ? "空間 QR Code 產生" : "設備 QR Code 產生"}
          </h1>
          <p className="text-muted-foreground text-sm">
            {targetType === "spaces"
              ? "全校各大樓空間地點報修條碼批量產生、即時預覽與 PDF 下載。"
              : "全校設施設備資產報修條碼批量產生、即時預覽與 PDF 下載。"}
          </p>
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

        {/* Right Column: Live Grid Preview */}
        <div className="lg:col-span-8 xl:col-span-8">
          {printableItems.length === 0 ? (
            <Card className="flex h-full min-h-[480px] items-center justify-center p-8 border-dashed">
              <Empty>
                <EmptyMedia>
                  <div className="flex size-12 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                    <QrCode className="size-6" />
                  </div>
                </EmptyMedia>
                <EmptyHeader>
                  <EmptyTitle>尚未選取任何項目</EmptyTitle>
                  <EmptyDescription>
                    請從左側面板勾選要列印的空間或設備，以即時產生並預覽 QR Code 卡片。
                  </EmptyDescription>
                </EmptyHeader>
                <EmptyContent>
                  <Button variant="outline" size="sm" onClick={handleSelectAll}>
                    全選所有項目
                  </Button>
                </EmptyContent>
              </Empty>
            </Card>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-sm text-foreground">預覽輸出卡片</h3>
                  <Badge variant="secondary" className="font-mono text-xs">
                    共 {printableItems.length} 張卡片
                  </Badge>
                </div>
                <p className="text-muted-foreground text-xs">A4 列印每頁排版 6 張（2×3 網格）</p>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
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
