"use client";

import { useEffect, useState, useTransition } from "react";

import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import type { EquipmentFormData, EquipmentRow } from "../_actions/equipment-actions";

export interface BuildingOption {
  id: string;
  name: string;
  code: string;
  spaces: {
    id: string;
    name: string;
    floor: number;
  }[];
}

interface EquipmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  initialData?: EquipmentRow | null;
  buildings: BuildingOption[];
  onSubmit: (data: EquipmentFormData) => Promise<{ success: boolean; error?: string | null }>;
}

export function EquipmentDialog({ open, onOpenChange, mode, initialData, buildings, onSubmit }: EquipmentDialogProps) {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [selectedBuildingId, setSelectedBuildingId] = useState<string>("");
  const [selectedSpaceId, setSelectedSpaceId] = useState<string>("");
  const [purchaseDate, setPurchaseDate] = useState<string>("");
  const [warrantyExpiry, setWarrantyExpiry] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (open) {
      setError(null);
      if (initialData) {
        setName(initialData.name);
        setCode(initialData.code);
        setSelectedBuildingId(initialData.space.building_id || initialData.space.building.id);
        setSelectedSpaceId(initialData.space_id);
        setPurchaseDate(initialData.purchase_date ?? "");
        setWarrantyExpiry(initialData.warranty_expiry ?? "");
      } else {
        setName("");
        setCode("");
        const defaultBldg = buildings[0]?.id ?? "";
        setSelectedBuildingId(defaultBldg);
        const defaultSpace = buildings[0]?.spaces[0]?.id ?? "";
        setSelectedSpaceId(defaultSpace);
        setPurchaseDate("");
        setWarrantyExpiry("");
      }
    }
  }, [open, initialData, buildings]);

  const handleBuildingChange = (buildingId: string) => {
    setSelectedBuildingId(buildingId);
    const targetBldg = buildings.find((b) => b.id === buildingId);
    const firstSpace = targetBldg?.spaces[0]?.id ?? "";
    setSelectedSpaceId(firstSpace);
  };

  const selectedBuildingObj = buildings.find((b) => b.id === selectedBuildingId);
  const availableSpaces = selectedBuildingObj?.spaces ?? [];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("設備名稱不可為空白");
      return;
    }
    if (!code.trim()) {
      setError("設備代碼不可為空白");
      return;
    }
    if (!selectedSpaceId) {
      setError("請選擇所屬空間");
      return;
    }

    setError(null);
    startTransition(async () => {
      const res = await onSubmit({
        name: name.trim(),
        code: code.trim().toUpperCase(),
        space_id: selectedSpaceId,
        purchase_date: purchaseDate || null,
        warranty_expiry: warrantyExpiry || null,
      });

      if (res.success) {
        onOpenChange(false);
      } else {
        setError(res.error ?? "操作失敗");
      }
    });
  };

  const title = mode === "create" ? "新增校園設備資產" : "編輯設備資產";
  const description =
    mode === "create"
      ? "填寫設備資訊，包含名稱、唯一資產代碼、存放地點與保固期限。"
      : "修改設備資產資訊。代碼為全校唯一。";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="equipment-name">設備名稱 *</Label>
              <Input
                id="equipment-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="例如：301 投影機、E1 音響系統"
                disabled={isPending}
                autoFocus
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="equipment-code">設備代碼 (唯一碼) *</Label>
              <Input
                id="equipment-code"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="例如：PRJ-301-01"
                disabled={isPending}
              />
            </div>

            {/* Cascading Picker: Building & Space */}
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label>所在大樓 *</Label>
                <Select
                  value={selectedBuildingId}
                  onValueChange={handleBuildingChange}
                  disabled={isPending || buildings.length === 0}
                >
                  <SelectTrigger size="default" className="w-full">
                    <SelectValue placeholder="選擇大樓" />
                  </SelectTrigger>
                  <SelectContent>
                    {buildings.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.name} ({b.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label>所在空間 *</Label>
                <Select
                  value={selectedSpaceId}
                  onValueChange={setSelectedSpaceId}
                  disabled={isPending || availableSpaces.length === 0}
                >
                  <SelectTrigger size="default" className="w-full">
                    <SelectValue placeholder={availableSpaces.length === 0 ? "此大樓無空間" : "選擇空間"} />
                  </SelectTrigger>
                  <SelectContent>
                    {availableSpaces.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.floor > 0 ? `${s.floor}F` : `B${Math.abs(s.floor)}`} - {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label htmlFor="purchase-date">購入日期</Label>
                <Input
                  id="purchase-date"
                  type="date"
                  value={purchaseDate}
                  onChange={(e) => setPurchaseDate(e.target.value)}
                  disabled={isPending}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="warranty-expiry">保固到期日</Label>
                <Input
                  id="warranty-expiry"
                  type="date"
                  value={warrantyExpiry}
                  onChange={(e) => setWarrantyExpiry(e.target.value)}
                  disabled={isPending}
                />
              </div>
            </div>

            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
              取消
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {mode === "create" ? "建立" : "儲存"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
