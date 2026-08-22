import { createClient } from "@/lib/supabase/server";
import { getSession } from "@/server/auth/session";

import { type EquipmentInfo, type EquipmentOption, ReportForm } from "./_components/report-form";

interface ReportPageProps {
  searchParams: Promise<{
    location_id?: string;
    equipment_id?: string;
  }>;
}

export default async function ReportPage({ searchParams }: ReportPageProps) {
  const { location_id, equipment_id } = await searchParams;
  const supabase = await createClient();

  const buildingsPromise = supabase.from("buildings").select("id, name, code, spaces(id, name, floor)").order("name");

  const categoriesPromise = supabase.from("categories").select("id, name").eq("is_active", true).order("sort_order");

  const allEquipmentPromise = supabase.from("equipment").select("id, name, code, space_id").order("name");

  const sessionPromise = getSession();

  const equipmentPromise = equipment_id
    ? supabase
        .from("equipment")
        .select("id, name, code, space_id, space:spaces(id, name, building_id)")
        .eq("id", equipment_id)
        .single()
    : Promise.resolve({ data: null });

  const [buildingsRes, categoriesRes, allEquipmentRes, eqRes, session] = await Promise.all([
    buildingsPromise,
    categoriesPromise,
    allEquipmentPromise,
    equipmentPromise,
    sessionPromise,
  ]);

  const buildingsData = buildingsRes.data;
  const categoriesData = categoriesRes.data;
  const allEquipmentData = (allEquipmentRes.data || []) as EquipmentOption[];
  const eqData = eqRes.data;

  let initialEquipment: EquipmentInfo | null = null;
  if (eqData) {
    // Cast nested space relation
    const spaceObj = Array.isArray(eqData.space) ? eqData.space[0] : eqData.space;
    if (spaceObj) {
      initialEquipment = {
        id: eqData.id,
        name: eqData.name,
        code: eqData.code,
        space_id: eqData.space_id,
        space: spaceObj,
      };
    }
  }

  const buildings = (buildingsData || []).map((b) => ({
    ...b,
    spaces: b.spaces || [],
  }));

  const categories = categoriesData || [];

  const userInfo = session
    ? {
        name: session.displayName ?? "",
        department: session.department ?? "",
        email: session.email ?? "",
        phone: session.phone ?? "",
      }
    : undefined;

  return (
    <ReportForm
      buildings={buildings}
      categories={categories}
      equipmentList={allEquipmentData}
      initialSpaceId={location_id}
      initialEquipment={initialEquipment}
      userInfo={userInfo}
    />
  );
}
