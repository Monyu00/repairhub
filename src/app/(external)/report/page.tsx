import { createClient } from "@/lib/supabase/server";

import { type EquipmentInfo, ReportForm } from "./_components/report-form";

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

  const equipmentPromise = equipment_id
    ? supabase
        .from("equipment")
        .select("id, name, code, space_id, space:spaces(id, name, building_id)")
        .eq("id", equipment_id)
        .single()
    : Promise.resolve({ data: null });

  const [buildingsRes, categoriesRes, eqRes] = await Promise.all([
    buildingsPromise,
    categoriesPromise,
    equipmentPromise,
  ]);

  const buildingsData = buildingsRes.data;
  const categoriesData = categoriesRes.data;
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

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">線上設施報修系統</h1>
        <p className="mt-1 text-sm text-muted-foreground">請填寫以下報修資訊，我們將儘速安排專業人員處理。</p>
      </div>

      <ReportForm
        buildings={buildings}
        categories={categories}
        initialSpaceId={location_id}
        initialEquipment={initialEquipment}
      />
    </div>
  );
}
