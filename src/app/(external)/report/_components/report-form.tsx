"use client";

import { useActionState, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { submitReport, type FormState } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { PhotoUpload } from "./photo-upload";
import { Spinner } from "@/components/ui/spinner";
import { WrenchIcon, AlertCircleIcon, CheckCircle2Icon, MapPinIcon } from "lucide-react";

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

interface ReportFormProps {
  buildings: BuildingWithSpaces[];
  categories: CategoryItem[];
  initialSpaceId?: string;
  initialEquipment?: EquipmentInfo | null;
}

const initialState: FormState = {};

export function ReportForm({
  buildings,
  categories,
  initialSpaceId,
  initialEquipment,
}: ReportFormProps) {
  const router = useRouter();

  // Find initial building & space from initialEquipment or initialSpaceId
  let defaultBuildingId = "";
  let defaultSpaceId = "";
  let defaultEquipmentId = initialEquipment?.id || "";

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
  const [state, formAction, isPending] = useActionState(submitReport, initialState);

  // Available spaces for currently selected building
  const selectedBuilding = buildings.find((b) => b.id === selectedBuildingId);
  const availableSpaces = selectedBuilding?.spaces || [];

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
  };

  return (
    <form action={formAction} className="space-y-6">
      {state.error && (
        <div className="flex items-center gap-2.5 rounded-lg border border-destructive/30 bg-destructive/10 p-3.5 text-sm text-destructive">
          <AlertCircleIcon className="size-4 shrink-0" />
          <span>{state.error}</span>
        </div>
      )}

      {/* Equipment info banner if present */}
      {initialEquipment && (
        <div className="flex items-center gap-2.5 rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm text-primary">
          <WrenchIcon className="size-4 shrink-0" />
          <div>
            <span className="font-medium">標定設備：</span>
            <span>{initialEquipment.name} ({initialEquipment.code})</span>
          </div>
        </div>
      )}

      <input type="hidden" name="equipment_id" value={defaultEquipmentId} />

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
            onChange={(e) => setSelectedSpaceId(e.target.value)}
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
      <div className="space-y-4 pt-2 border-t border-border">
        <Field aria-invalid={!!state.fieldErrors?.reporter_email}>
          <FieldLabel htmlFor="reporter_email">
            通報人電子郵件 <span className="text-destructive">*</span>
          </FieldLabel>
          <Input
            id="reporter_email"
            name="reporter_email"
            type="email"
            placeholder="example@domain.com"
          />
          <FieldError>{state.fieldErrors?.reporter_email}</FieldError>
        </Field>

        <Field aria-invalid={!!state.fieldErrors?.reporter_phone}>
          <FieldLabel htmlFor="reporter_phone">
            聯絡電話 (選填)
          </FieldLabel>
          <Input
            id="reporter_phone"
            name="reporter_phone"
            type="tel"
            placeholder="0912345678"
          />
          <FieldError>{state.fieldErrors?.reporter_phone}</FieldError>
        </Field>
      </div>

      <Button type="submit" disabled={isPending} className="w-full h-11 text-base font-medium">
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
  );
}
