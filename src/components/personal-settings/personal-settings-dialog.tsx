"use client";

import { type ReactNode, useEffect, useState, useTransition } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { fetchMyProfile, type MyProfile } from "@/server/personal-settings/actions";

import { AccountSecurityCard } from "./account-security-card";
import { CurrentLoginInfoCard } from "./current-login-info-card";
import { DeleteAccountCard } from "./delete-account-card";
import { NotificationPreferencesCard } from "./notification-preferences-card";
import { PasskeyManagementCard } from "./passkey-management-card";
import { PersonalProfileForm } from "./personal-profile-form";

const PROFILE_TABS = [
  { value: "profile", label: "個人資料" },
  { value: "notifications", label: "通知偏好" },
  { value: "security", label: "帳號安全" },
] as const;

type ProfileTab = (typeof PROFILE_TABS)[number]["value"];

interface PersonalSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PersonalSettingsDialog({ open, onOpenChange }: PersonalSettingsDialogProps) {
  const [profile, setProfile] = useState<MyProfile | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const [activeTab, setActiveTab] = useState<ProfileTab>("profile");

  // 分頁切換會 unmount 子元件，子元件的 useState 只在 mount 時讀 profile；
  // 儲存後回寫快照，切走再切回才不會看到存檔前的舊值。
  const handleSaved = (patch: Partial<MyProfile>) => {
    setProfile((previous) => (previous ? { ...previous, ...patch } : previous));
  };

  useEffect(() => {
    if (!open) return;

    setActiveTab("profile");
    startTransition(async () => {
      const result = await fetchMyProfile();
      setProfile(result.profile);
      // session 過期時 fetchMyProfile 只回 profile: null，不能讓對話框一直卡在骨架畫面。
      setLoadError(result.loadError ?? (result.profile ? null : "無法載入個人資料，請重新登入後再試"));
    });
  }, [open]);

  let content: ReactNode;

  if (loadError) {
    content = (
      <Alert variant="destructive">
        <AlertTitle>無法載入個人設定</AlertTitle>
        <AlertDescription>{loadError}</AlertDescription>
      </Alert>
    );
  } else if (!profile) {
    content = (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-9 w-full max-w-64" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  } else {
    content = (
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as ProfileTab)} className="gap-4">
        <TabsList className="h-9 p-1">
          {PROFILE_TABS.map((tab) => (
            <TabsTrigger className="px-3 text-xs" key={tab.value} value={tab.value}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent className="mt-0" value="profile">
          <PersonalProfileForm profile={profile} onSaved={handleSaved} />
        </TabsContent>

        <TabsContent className="mt-0" value="notifications">
          <NotificationPreferencesCard profile={profile} onSaved={handleSaved} />
        </TabsContent>

        <TabsContent className="mt-0" value="security">
          <div className="flex flex-col gap-4">
            <CurrentLoginInfoCard profile={profile} />
            <AccountSecurityCard mustChangePassword={profile.mustChangePassword} />
            <PasskeyManagementCard />
            <DeleteAccountCard email={profile.email} disabled={profile.mustChangePassword} />
          </div>
        </TabsContent>
      </Tabs>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] gap-0 overflow-y-auto sm:max-w-[680px]">
        <DialogHeader>
          <DialogTitle>個人設定</DialogTitle>
          <DialogDescription>管理你的個人資料、通知偏好與帳號安全。</DialogDescription>
        </DialogHeader>

        {content}
      </DialogContent>
    </Dialog>
  );
}
