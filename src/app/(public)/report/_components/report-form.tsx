"use client";

import { useActionState, useEffect, useState } from "react";

import { useRouter } from "next/navigation";

import { AlertCircleIcon, ArrowLeftIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";

import { type FormState, submitReport } from "../actions";
import { PhotoUpload } from "./photo-upload";

export type BuildingWithSpaces = {
  id: string;
  name: string;
  code: string;
  spaces: {
    id: string;
    name: string;
    floor: number;
  }[];
};

export type CategoryItem = {
  id: string;
  name: string;
};

export type EquipmentOption = {
  id: string;
  name: string;
  code: string;
  space_id: string;
};

export type EquipmentInfo = {
  id: string;
  name: string;
  code: string;
  space_id: string;
  space: {
    id: string;
    name: string;
    building_id: string;
  };
};

export type UserInfo = {
  name?: string;
  department?: string;
  email?: string;
  phone?: string;
};

interface ReportFormProps {
  buildings: BuildingWithSpaces[];
  categories: CategoryItem[];
  equipmentList?: EquipmentOption[];
  initialSpaceId?: string;
  initialEquipment?: EquipmentInfo | null;
  userInfo?: UserInfo;
}

const initialState: FormState = {};

export function ReportForm({
  buildings,
  categories,
  equipmentList = [],
  initialSpaceId,
  initialEquipment,
  userInfo,
}: ReportFormProps) {
  const router = useRouter();

  // Find initial building & space from initialEquipment or initialSpaceId
  let defaultBuildingId = "";
  let defaultSpaceId = "";
  const defaultEquipmentId = initialEquipment?.id ?? "";

  if (initialEquipment) {
    defaultSpaceId = initialEquipment.space_id;
    defaultBuildingId = initialEquipment.space?.building_id || "";
  } else if (initialSpaceId) {
    defaultSpaceId = initialSpaceId;
    for (const b of buildings) {
      if (b.spaces.some((s) => s.id === initialSpaceId)) {
        defaultBuildingId = b.id;
        break;
      }
    }
  }

  const [selectedBuildingId, setSelectedBuildingId] = useState<string>(defaultBuildingId);
  const [selectedSpaceId, setSelectedSpaceId] = useState<string>(defaultSpaceId);
  const [equipmentSelection, setEquipmentSelection] = useState<string>(defaultEquipmentId);
  const [customEquipmentName, setCustomEquipmentName] = useState<string>("");
  const [state, formAction, isPending] = useActionState(submitReport, initialState);

  // Available spaces for currently selected building
  const selectedBuilding = buildings.find((b) => b.id === selectedBuildingId);
  const availableSpaces = selectedBuilding?.spaces || [];

  // Available equipments for currently selected space
  const availableEquipments = selectedSpaceId ? equipmentList.filter((e) => e.space_id === selectedSpaceId) : [];

  // Redirect on success
  useEffect(() => {
    if (state.success && state.ticketId) {
      router.push(`/track/${state.ticketId}`);
    }
  }, [state.success, state.ticketId, router]);

  const handleBuildingChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newBuildingId = e.target.value;
    setSelectedBuildingId(newBuildingId);
    setSelectedSpaceId("");
    setEquipmentSelection("");
    setCustomEquipmentName("");
  };

  const handleSpaceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newSpaceId = e.target.value;
    setSelectedSpaceId(newSpaceId);
    setEquipmentSelection("");
    setCustomEquipmentName("");
  };

  // Determine final equipment values for form submission
  const selectedEquipment = availableEquipments.find((e) => e.id === equipmentSelection);
  const finalEquipmentId = selectedEquipment ? selectedEquipment.id : "";

  let finalEquipmentName = "";
  if (availableEquipments.length === 0 || equipmentSelection === "__custom__") {
    finalEquipmentName = customEquipmentName;
  } else if (selectedEquipment) {
    finalEquipmentName = `${selectedEquipment.name} (${selectedEquipment.code})`;
  }

  return (
    <div>
      {/* Header with Back Button */}
      <div className="mb-6 flex items-start gap-2.5 sm:gap-3">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={() => router.back()}
          className="mt-0.5 -ml-1 shrink-0 text-muted-foreground transition-colors hover:text-foreground"
          aria-label="返回上一頁"
        >
          <ArrowLeftIcon className="size-4" />
        </Button>
        <div>
          <h1 className="font-semibold text-foreground text-xl tracking-tight sm:text-2xl">線上設施報修系統</h1>
          <p className="mt-1 text-muted-foreground text-sm">請填寫以下報修資訊，我們將儘速安排專業人員處理。</p>
        </div>
      </div>

      <form action={formAction} className="space-y-6">
        {state.error && (
          <div className="flex items-center gap-2.5 rounded-lg border border-destructive/30 bg-destructive/10 p-3.5 text-destructive text-sm">
            <AlertCircleIcon className="size-4 shrink-0" />
            <span>{state.error}</span>
          </div>
        )}

        {/* Hidden inputs for equipment tracking */}
        <input type="hidden" name="equipment_id" value={finalEquipmentId} />
        <input type="hidden" name="equipment_name" value={finalEquipmentName} />

        {/* Location (Building & Space) */}
        <div className="space-y-4">
          <Field>
            <FieldLabel htmlFor="building_id">
              大樓棟別 <span className="text-destructive">*</span>
            </FieldLabel>
            <NativeSelect
              id="building_id"
              value={selectedBuildingId}
              onChange={handleBuildingChange}
              className="w-full"
            >
              <NativeSelectOption value="">-- 請選擇大樓 --</NativeSelectOption>
              {buildings.map((b) => (
                <NativeSelectOption key={b.id} value={b.id}>
                  {b.name} ({b.code})
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </Field>

          <Field aria-invalid={!!state.fieldErrors?.space_id}>
            <FieldLabel htmlFor="space_id">
              空間 / 教室名稱 <span className="text-destructive">*</span>
            </FieldLabel>
            <NativeSelect
              id="space_id"
              name="space_id"
              value={selectedSpaceId}
              onChange={handleSpaceChange}
              disabled={!selectedBuildingId}
              className="w-full"
            >
              <NativeSelectOption value="">
                {selectedBuildingId ? "-- 請選擇空間 --" : "-- 請先選擇大樓 --"}
              </NativeSelectOption>
              {availableSpaces.map((s) => (
                <NativeSelectOption key={s.id} value={s.id}>
                  {s.floor > 0 ? `${s.floor}F` : `B${Math.abs(s.floor)}`} - {s.name}
                </NativeSelectOption>
              ))}
            </NativeSelect>
            <FieldError>{state.fieldErrors?.space_id}</FieldError>
          </Field>
        </div>

        {/* Equipment Selection (Optional) */}
        <div className="space-y-3">
          <Field>
            <FieldLabel htmlFor="equipment_select">設備項目 (選填)</FieldLabel>
            {!selectedSpaceId && (
              <NativeSelect id="equipment_select" disabled className="w-full">
                <NativeSelectOption value="">-- 請先選擇空間 --</NativeSelectOption>
              </NativeSelect>
            )}

            {Boolean(selectedSpaceId && availableEquipments.length > 0) && (
              <div className="space-y-3">
                <NativeSelect
                  id="equipment_select"
                  value={equipmentSelection}
                  onChange={(e) => {
                    setEquipmentSelection(e.target.value);
                    if (e.target.value !== "__custom__") {
                      setCustomEquipmentName("");
                    }
                  }}
                  className="w-full"
                >
                  <NativeSelectOption value="">-- 不指定特定設備（選填）--</NativeSelectOption>
                  {availableEquipments.map((eq) => (
                    <NativeSelectOption key={eq.id} value={eq.id}>
                      {eq.name} ({eq.code})
                    </NativeSelectOption>
                  ))}
                  <NativeSelectOption value="__custom__">其他（手動輸入設備名稱）</NativeSelectOption>
                </NativeSelect>

                {equipmentSelection === "__custom__" && (
                  <Input
                    placeholder="請輸入設備名稱（如：第 2 排投影機、窗邊冷氣）"
                    value={customEquipmentName}
                    onChange={(e) => setCustomEquipmentName(e.target.value)}
                    className="w-full"
                  />
                )}
              </div>
            )}

            {Boolean(selectedSpaceId && availableEquipments.length === 0) && (
              <Input
                placeholder="請輸入設備名稱（選填，如：第 2 排投影機、窗邊冷氣）"
                value={customEquipmentName}
                onChange={(e) => setCustomEquipmentName(e.target.value)}
                className="w-full"
              />
            )}
          </Field>
        </div>

        {/* Category */}
        <Field aria-invalid={!!state.fieldErrors?.category_id}>
          <FieldLabel htmlFor="category_id">
            報修類別 <span className="text-destructive">*</span>
          </FieldLabel>
          <NativeSelect id="category_id" name="category_id" className="w-full">
            <NativeSelectOption value="">-- 請選擇報修類別 --</NativeSelectOption>
            {categories.map((c) => (
              <NativeSelectOption key={c.id} value={c.id}>
                {c.name}
              </NativeSelectOption>
            ))}
          </NativeSelect>
          <FieldError>{state.fieldErrors?.category_id}</FieldError>
        </Field>

        {/* Description */}
        <Field aria-invalid={!!state.fieldErrors?.description}>
          <FieldLabel htmlFor="description">
            故障狀況描述 <span className="text-destructive">*</span>
          </FieldLabel>
          <Textarea
            id="description"
            name="description"
            placeholder="請詳細描述設備故障或設施損壞狀況..."
            className="min-h-24"
          />
          <FieldError>{state.fieldErrors?.description}</FieldError>
        </Field>

        {/* Photo Upload */}
        <Field>
          <FieldLabel>現場照片 (選填，最多 3 張)</FieldLabel>
          <PhotoUpload maxPhotos={3} maxFileSizeMB={5} />
        </Field>

        {/* Reporter Contact Info */}
        <div className="space-y-4 border-border border-t pt-4">
          <div className="font-medium text-muted-foreground text-xs uppercase tracking-wider">通報人聯絡資訊</div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field aria-invalid={!!state.fieldErrors?.reporter_name}>
              <FieldLabel htmlFor="reporter_name">
                聯絡人姓名 <span className="text-destructive">*</span>
              </FieldLabel>
              <Input
                id="reporter_name"
                name="reporter_name"
                defaultValue={userInfo?.name ?? ""}
                placeholder="例如：王大明"
              />
              <FieldError>{state.fieldErrors?.reporter_name}</FieldError>
            </Field>

            <Field>
              <FieldLabel htmlFor="reporter_department">所屬單位 (選填)</FieldLabel>
              <Input
                id="reporter_department"
                name="reporter_department"
                defaultValue={userInfo?.department ?? ""}
                placeholder="例如：資工系、總務處"
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field aria-invalid={!!state.fieldErrors?.reporter_email}>
              <FieldLabel htmlFor="reporter_email">
                電子郵件 <span className="text-destructive">*</span>
              </FieldLabel>
              <Input
                id="reporter_email"
                name="reporter_email"
                type="email"
                defaultValue={userInfo?.email ?? ""}
                placeholder="example@domain.com"
              />
              <FieldError>{state.fieldErrors?.reporter_email}</FieldError>
            </Field>

            <Field aria-invalid={!!state.fieldErrors?.reporter_phone}>
              <FieldLabel htmlFor="reporter_phone">聯絡電話 (選填)</FieldLabel>
              <Input
                id="reporter_phone"
                name="reporter_phone"
                type="tel"
                defaultValue={userInfo?.phone ?? ""}
                placeholder="0912345678"
              />
              <FieldError>{state.fieldErrors?.reporter_phone}</FieldError>
            </Field>
          </div>
        </div>

        <Button type="submit" disabled={isPending} className="h-11 w-full font-medium text-base">
          {isPending ? (
            <>
              <Spinner className="mr-2 size-4" />
              處理中...
            </>
          ) : (
            "送出報修單"
          )}
        </Button>
      </form>
    </div>
  );
}
