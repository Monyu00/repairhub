import { redirect } from "next/navigation";

import type { Metadata } from "next";

import { getLocationCatalog } from "@/lib/locations";
import { getSession } from "@/server/auth/session";

import { fetchEquipmentList } from "./_actions/equipment-actions";
import { EquipmentManagement } from "./_components/equipment-management";

export const metadata: Metadata = {
  title: "設備管理 - RepairHub",
  description: "全校設施設備資產維護、保固追蹤與歷史維修單紀錄管理。",
};

export default async function EquipmentPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  if (session.role !== "admin") {
    redirect("/dashboard");
  }

  const supabase = session.supabase;

  const [equipmentRes, buildings] = await Promise.all([fetchEquipmentList(), getLocationCatalog(supabase)]);

  const equipmentList = equipmentRes.equipment ?? [];

  return <EquipmentManagement initialEquipment={equipmentList} buildings={buildings} />;
}
