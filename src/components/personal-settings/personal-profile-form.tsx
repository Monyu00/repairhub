"use client";

import { useEffect, useRef, useState, useTransition } from "react";

import { Loader2, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { MAX_RAW_PHOTO_SIZE_BYTES } from "@/lib/storage/constants";
import { getUserRoleLabel } from "@/lib/users/projection";
import { compressImage } from "@/lib/utils/compress-image";
import { type MyProfile, updateMyAvatar, updateMyProfile } from "@/server/personal-settings/actions";
import { profileInputSchema } from "@/server/personal-settings/input";

const ALLOWED_AVATAR_FILE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

type ProfileFormErrors = Partial<Record<"displayName" | "department" | "phone", string>>;

interface PersonalProfileFormProps {
  profile: MyProfile;
  onSaved: (patch: Partial<MyProfile>) => void;
}

export function PersonalProfileForm({ profile, onSaved }: PersonalProfileFormProps) {
  const [values, setValues] = useState({
    displayName: profile.displayName ?? "",
    department: profile.department ?? "",
    phone: profile.phone ?? "",
  });
  const [errors, setErrors] = useState<ProfileFormErrors>({});
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [removeAvatar, setRemoveAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!avatarFile) {
      setAvatarPreview(null);
      return;
    }

    const objectUrl = URL.createObjectURL(avatarFile);
    setAvatarPreview(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [avatarFile]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const parsed = profileInputSchema.safeParse(values);
    if (!parsed.success) {
      const nextErrors: ProfileFormErrors = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0];
        if (typeof field === "string" && !nextErrors[field as keyof ProfileFormErrors]) {
          nextErrors[field as keyof ProfileFormErrors] = issue.message;
        }
      }
      setErrors(nextErrors);
      return;
    }

    setErrors({});

    startTransition(async () => {
      let compressedAvatar: Awaited<ReturnType<typeof compressImage>> | null = null;
      if (avatarFile) {
        try {
          compressedAvatar = await compressImage(avatarFile, 256, 0.85);
        } catch (error) {
          console.error("Failed to compress selected avatar:", error);
          setAvatarError("無法讀取選擇的圖片，請換一張試試");
          return;
        }
      }

      const result = await updateMyProfile(parsed.data);
      if (!result.success) {
        toast.error("個人資料儲存失敗", { description: result.error });
        return;
      }

      const avatarPatch: Partial<MyProfile> = {};
      if (compressedAvatar) {
        const avatarResult = await updateMyAvatar({ imageDataUrl: compressedAvatar.base64 });
        if (!avatarResult.success) {
          setAvatarError(avatarResult.error ?? "頭像更新失敗");
          toast.error("個人資料已儲存，但頭像更新失敗", { description: avatarResult.error });
          onSaved(parsed.data);
          return;
        }
        avatarPatch.avatarUrl = avatarResult.avatarUrl ?? null;
        setAvatarFile(null);
        setRemoveAvatar(false);
      } else if (removeAvatar) {
        const avatarResult = await updateMyAvatar({ remove: true });
        if (!avatarResult.success) {
          setAvatarError(avatarResult.error ?? "頭像移除失敗");
          toast.error("個人資料已儲存，但頭像移除失敗", { description: avatarResult.error });
          onSaved(parsed.data);
          return;
        }
        avatarPatch.avatarUrl = null;
        setRemoveAvatar(false);
      }

      // 空字串在 server 端會存成 NULL，快照跟著正規化，切換分頁回來才與 DB 一致。
      onSaved({
        ...parsed.data,
        department: parsed.data.department || null,
        phone: parsed.data.phone || null,
        ...avatarPatch,
      });
      toast.success("個人資料已儲存");
      setAvatarError(null);
      if (avatarInputRef.current) avatarInputRef.current.value = "";
    });
  };

  const handleAvatarFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setAvatarError(null);

    if (!file) {
      setAvatarFile(null);
      return;
    }

    if (!ALLOWED_AVATAR_FILE_TYPES.has(file.type)) {
      setAvatarError("頭像只支援 JPG、PNG 或 WebP");
      setAvatarFile(null);
      event.target.value = "";
      return;
    }

    if (file.size > MAX_RAW_PHOTO_SIZE_BYTES) {
      setAvatarError("頭像大小不可超過 5MB");
      setAvatarFile(null);
      event.target.value = "";
      return;
    }

    setRemoveAvatar(false);
    setAvatarFile(file);
  };

  const handleRemoveAvatar = () => {
    setAvatarError(null);
    setAvatarFile(null);
    setRemoveAvatar(true);
    if (avatarInputRef.current) avatarInputRef.current.value = "";
  };

  const avatarSrc = removeAvatar ? undefined : (avatarPreview ?? profile.avatarUrl ?? undefined);
  const displayName = values.displayName.trim() || profile.displayName?.trim() || profile.email;
  const initials = displayName.trim().slice(0, 2).toUpperCase();

  return (
    <Card>
      <CardHeader>
        <CardTitle>個人資料</CardTitle>
        <CardDescription>這些資訊會顯示在你的報修單據與聯絡資訊中。</CardDescription>
      </CardHeader>
      <CardContent>
        <form noValidate className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <FieldGroup className="gap-4">
            <Field data-invalid={Boolean(errors.displayName)}>
              <FieldLabel htmlFor="profile-display-name">顯示名稱 (Display Name)</FieldLabel>
              <Input
                id="profile-display-name"
                value={values.displayName}
                maxLength={50}
                onChange={(event) => setValues((prev) => ({ ...prev, displayName: event.target.value }))}
                placeholder="例如：張小明"
                disabled={isPending}
                aria-invalid={Boolean(errors.displayName)}
              />
              {errors.displayName && <FieldError>{errors.displayName}</FieldError>}
            </Field>

            <Field data-invalid={Boolean(errors.department)}>
              <FieldLabel htmlFor="profile-department">所屬部門 / 單位</FieldLabel>
              <Input
                id="profile-department"
                value={values.department}
                maxLength={100}
                onChange={(event) => setValues((prev) => ({ ...prev, department: event.target.value }))}
                placeholder="例如：總務處 事務組"
                disabled={isPending}
                aria-invalid={Boolean(errors.department)}
              />
              {errors.department && <FieldError>{errors.department}</FieldError>}
            </Field>

            <Field data-invalid={Boolean(errors.phone)}>
              <FieldLabel htmlFor="profile-phone">
                聯絡電話 / 分機 <span className="text-muted-foreground text-xs font-normal">（選填）</span>
              </FieldLabel>
              <Input
                id="profile-phone"
                value={values.phone}
                maxLength={30}
                onChange={(event) => setValues((prev) => ({ ...prev, phone: event.target.value }))}
                placeholder="例如：0912-345-678 或 #1234"
                disabled={isPending}
                aria-invalid={Boolean(errors.phone)}
              />
              <FieldDescription>僅能包含數字與 + - * # ( ) 字元，長度上限 30 字元。</FieldDescription>
              {errors.phone && <FieldError>{errors.phone}</FieldError>}
            </Field>
          </FieldGroup>

          <Field data-invalid={Boolean(avatarError)} data-disabled={isPending}>
            <FieldLabel htmlFor="profile-avatar">頭像</FieldLabel>
            <div className="flex flex-wrap items-center gap-3">
              <Avatar size="lg">
                <AvatarImage src={avatarSrc} alt={displayName} />
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
              <div className="flex min-w-56 flex-1 flex-col gap-2 sm:min-w-64">
                <Input
                  id="profile-avatar"
                  ref={avatarInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleAvatarFileChange}
                  disabled={isPending}
                  aria-invalid={Boolean(avatarError)}
                />
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleRemoveAvatar}
                    disabled={isPending || removeAvatar || !profile.avatarUrl}
                  >
                    <Trash2 data-icon="inline-start" />
                    移除頭像
                  </Button>
                  {avatarFile && <span className="text-muted-foreground text-xs">已選擇：{avatarFile.name}</span>}
                </div>
              </div>
            </div>
            <FieldDescription>
              支援 JPG、PNG、WebP，上限 5MB。儲存時會自動調整為 256px。
              {removeAvatar ? "目前狀態：按下儲存變更後移除頭像。" : ""}
            </FieldDescription>
            {avatarError && <FieldError>{avatarError}</FieldError>}
          </Field>

          <div className="border-border bg-muted/20 grid gap-2 rounded-lg border p-3 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-1">
              <span className="text-muted-foreground">電子郵件</span>
              <span className="text-foreground font-medium break-all">{profile.email}</span>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-1">
              <span className="text-muted-foreground">系統權限角色</span>
              <span className="text-foreground font-medium">{getUserRoleLabel(profile.role)}</span>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-1">
              <span className="text-muted-foreground">帳號狀態</span>
              <span className="text-foreground font-medium">{profile.isActive ? "啟用中" : "已停用"}</span>
            </div>
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={isPending}>
              {isPending ? (
                <Loader2 data-icon="inline-start" className="animate-spin" />
              ) : (
                <Save data-icon="inline-start" />
              )}
              儲存變更
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
