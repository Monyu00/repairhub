"use client";

import { useCallback } from "react";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import type { MyProfile } from "../_actions/profile-actions";
import { AccountSecurityCard } from "./account-security-card";
import { CurrentLoginInfoCard } from "./current-login-info-card";
import { NotificationPreferencesCard } from "./notification-preferences-card";
import { PersonalProfileForm } from "./personal-profile-form";

const PROFILE_TABS = ["profile", "notifications", "security"] as const;

type ProfileTab = (typeof PROFILE_TABS)[number];

function resolveTab(value: string | null): ProfileTab {
  return PROFILE_TABS.find((tab) => tab === value) ?? "profile";
}

interface ProfileSettingsProps {
  profile: MyProfile;
}

export function ProfileSettings({ profile }: ProfileSettingsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeTab = resolveTab(searchParams.get("tab"));

  const handleTabChange = useCallback(
    (value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", value);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="font-bold font-heading text-2xl text-foreground tracking-tight">個人設定</h1>
        <p className="text-muted-foreground text-sm">管理你的個人資料、通知偏好與帳號安全。</p>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
        <TabsList className="h-9 p-1">
          <TabsTrigger value="profile" className="px-3 text-xs">
            個人資料
          </TabsTrigger>
          <TabsTrigger value="notifications" className="px-3 text-xs">
            通知設定
          </TabsTrigger>
          <TabsTrigger value="security" className="px-3 text-xs">
            帳號安全
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-0">
          <PersonalProfileForm profile={profile} />
        </TabsContent>

        <TabsContent value="notifications" className="mt-0">
          <NotificationPreferencesCard profile={profile} />
        </TabsContent>

        <TabsContent value="security" className="mt-0">
          <div className="space-y-4">
            <CurrentLoginInfoCard profile={profile} />
            <AccountSecurityCard mustChangePassword={profile.mustChangePassword} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
