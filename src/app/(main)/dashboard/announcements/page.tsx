import { redirect } from "next/navigation";

import type { Metadata } from "next";

import { fetchAdminAnnouncements } from "@/server/announcements";
import { getSession } from "@/server/auth/session";

import { AnnouncementsPage } from "./_components/announcements-page";

export const metadata: Metadata = {
  title: "公告管理 - RepairHub",
  description: "發佈與管理全校設施設備營運公告、停機通知與修繕提醒。",
};

export default async function Page() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  if (session.role !== "admin") {
    redirect("/dashboard");
  }

  const { announcements } = await fetchAdminAnnouncements();

  return <AnnouncementsPage initialAnnouncements={announcements} />;
}
