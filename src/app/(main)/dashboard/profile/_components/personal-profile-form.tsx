"use client";

import { useState, useTransition } from "react";

import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { getUserRoleLabel } from "@/lib/users/projection";

import { type MyProfile, updateMyProfile } from "../_actions/profile-actions";
import { profileInputSchema } from "../_actions/profile-input";

type ProfileFormErrors = Partial<Record<"displayName" | "department" | "phone", string>>;

interface PersonalProfileFormProps {
  profile: MyProfile;
}

export function PersonalProfileForm({ profile }: PersonalProfileFormProps) {
  const [values, setValues] = useState({
    displayName: profile.displayName ?? "",
    department: profile.department ?? "",
    phone: profile.phone ?? "",
  });
  const [errors, setErrors] = useState<ProfileFormErrors>({});
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (event: React.FormEvent) => {
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
      const result = await updateMyProfile(parsed.data);
      if (!result.success) {
        toast.error("個人資料儲存失敗", { description: result.error });
        return;
      }
      toast.success("個人資料已儲存");
    });
  };

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
                聯絡電話 / 分機 <span className="font-normal text-muted-foreground text-xs">（選填）</span>
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

          <div className="grid gap-2 rounded-lg border border-border bg-muted/20 p-3 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-1">
              <span className="text-muted-foreground">頭像</span>
              <span className="font-medium break-all text-foreground">{profile.avatarUrl ?? "未設定"}</span>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-1">
              <span className="text-muted-foreground">電子郵件</span>
              <span className="font-medium break-all text-foreground">{profile.email}</span>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-1">
              <span className="text-muted-foreground">系統權限角色</span>
              <span className="font-medium text-foreground">{getUserRoleLabel(profile.role)}</span>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-1">
              <span className="text-muted-foreground">帳號狀態</span>
              <span className="font-medium text-foreground">{profile.isActive ? "啟用中" : "已停用"}</span>
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
