import { redirect } from "next/navigation";

import type { Metadata } from "next";

import { getLocationBySpaceId, getLocationCatalog } from "@/lib/locations";
import { getSession } from "@/server/auth/session";

import { QRCodeDashboard } from "./_components/qr-code-dashboard";
import type { EquipmentOption } from "./_components/types";

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

  const [buildings, equipmentRes] = await Promise.all([
    getLocationCatalog(supabase),
    supabase.from("equipment").select("id, name, code, space_id").order("name"),
  ]);

  const equipment: EquipmentOption[] = (equipmentRes.data ?? []).map((eq) => {
    const location = getLocationBySpaceId(buildings, eq.space_id);
    return {
      id: eq.id,
      name: eq.name,
      code: eq.code,
      ...location,
    };
  });

  return <QRCodeDashboard buildings={buildings} equipment={equipment} defaultTab={searchParams.tab} />;
}
