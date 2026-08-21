import { redirect } from "next/navigation";

import type { Metadata } from "next";

import { getSession } from "@/server/auth/session";

import { fetchEquipmentList } from "./_actions/equipment-actions";
import type { BuildingOption } from "./_components/equipment-dialog";
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

  // 2. Fetch equipment list and buildings in parallel
  const [equipmentRes, buildingsRes] = await Promise.all([
    fetchEquipmentList(),
    supabase.from("buildings").select("id, name, code, spaces(id, name, floor)").order("name"),
  ]);

  const equipmentList = equipmentRes.equipment ?? [];

  type RawBuilding = {
    id: string;
    name: string;
    code: string;
    spaces: { id: string; name: string; floor: number }[] | null;
  };

  const rawBuildings = (buildingsRes.data ?? []) as unknown as RawBuilding[];
  const buildings: BuildingOption[] = rawBuildings.map((b) => ({
    id: b.id,
    name: b.name,
    code: b.code,
    spaces: (b.spaces ?? []).sort((a, b) => {
      if (a.floor !== b.floor) return a.floor - b.floor;
      return a.name.localeCompare(b.name, "zh-Hant");
    }),
  }));

  return <EquipmentManagement initialEquipment={equipmentList} buildings={buildings} />;
}
