import { redirect } from "next/navigation";

import type { Metadata } from "next";

import { fetchMyProfile } from "./_actions/profile-actions";
import { ProfileSettings } from "./_components/profile-settings";

export const metadata: Metadata = {
  title: "個人設定 - RepairHub",
  description: "管理個人資料、通知偏好與帳號安全。",
};

export default async function ProfilePage() {
  const profile = await fetchMyProfile();

  if (!profile) {
    redirect("/login");
  }

  return <ProfileSettings profile={profile} />;
}
