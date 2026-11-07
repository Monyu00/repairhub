import { redirect } from "next/navigation";

import type { Metadata } from "next";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

import { fetchMyProfile } from "./_actions/profile-actions";
import { ProfileSettings } from "./_components/profile-settings";

export const metadata: Metadata = {
  title: "個人設定 - RepairHub",
  description: "管理個人資料、通知偏好與帳號安全。",
};

export default async function ProfilePage() {
  const { profile, loadError } = await fetchMyProfile();

  if (!profile) {
    // 查詢失敗要留在頁面上說清楚，只有真的沒有 session 才導去登入。
    if (loadError) {
      return (
        <Alert variant="destructive">
          <AlertTitle>無法載入個人設定</AlertTitle>
          <AlertDescription>{loadError}</AlertDescription>
        </Alert>
      );
    }
    redirect("/login");
  }

  return <ProfileSettings profile={profile} />;
}
