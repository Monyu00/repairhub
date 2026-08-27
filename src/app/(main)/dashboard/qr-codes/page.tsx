import { redirect } from "next/navigation";

import type { Metadata } from "next";

import { getSession } from "@/server/auth/session";

import { QRCodeDashboard } from "./_components/qr-code-dashboard";
import type { BuildingOption, EquipmentOption } from "./_components/types";

export const metadata: Metadata = {
  title: "批量 QR Code 產生 - RepairHub",
  description: "全校空間與設備報修 QR Code 批量產生、即時預覽與 PDF 下載。",
};

interface PageProps {
  searchParams: Promise<{ tab?: string }>;
}

export default async function QRCodesPage(props: PageProps) {
  const [session, searchParams] = await Promise.all([getSession(), props.searchParams]);

  if (!session) {
    redirect("/login");
  }

  if (session.role !== "admin") {
    redirect("/dashboard");
  }

  const supabase = session.supabase;

  // 2. Fetch buildings with spaces & equipment in parallel
  const [buildingsRes, equipmentRes] = await Promise.all([
    supabase.from("buildings").select("id, name, code, spaces(id, name, floor)").order("name"),
    supabase
      .from("equipment")
      .select("id, name, code, space_id, spaces(id, name, building_id, buildings(id, name))")
      .order("name"),
  ]);

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

  type RawEquipment = {
    id: string;
    name: string;
    code: string;
    space_id: string;
    spaces: {
      id: string;
      name: string;
      building_id: string;
      buildings: {
        id: string;
        name: string;
      } | null;
    } | null;
  };

  const rawEquipment = (equipmentRes.data ?? []) as unknown as RawEquipment[];
  const equipment: EquipmentOption[] = rawEquipment.map((eq) => {
    const space = eq.spaces;
    const building = space?.buildings;
    return {
      id: eq.id,
      name: eq.name,
      code: eq.code,
      spaceId: eq.space_id,
      spaceName: space?.name ?? "未指定空間",
      buildingId: space?.building_id ?? "",
      buildingName: building?.name ?? "未指定建築",
    };
  });

  return <QRCodeDashboard buildings={buildings} equipment={equipment} defaultTab={searchParams.tab} />;
}
