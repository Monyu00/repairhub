import type { Metadata } from "next";

import { createClient } from "@/lib/supabase/server";

import { MyTicketsContent } from "./_components/my-tickets-content";

export const metadata: Metadata = {
  title: "我的報修紀錄 - RepairHub",
  description: "查看您提交過的所有報修案件紀錄與處理進度。",
};

export default async function Page() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Middleware already enforces auth on /dashboard/*, so user should always be present.
  // Guard defensively anyway.
  if (!user?.email) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-muted-foreground">無法取得使用者資訊，請重新登入。</p>
      </div>
    );
  }

  const { data: tickets, error } = await supabase
    .from("tickets")
    .select(
      `
      id,
      status,
      created_at,
      category:categories(name),
      space:spaces(
        name,
        floor,
        building:buildings(name)
      )
    `,
    )
    .ilike("reporter_email", user.email)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching user tickets:", error);
  }

  // Flatten Supabase nested relation arrays
  type RawTicket = Record<string, unknown>;
  const flatTickets = ((tickets ?? []) as unknown[]).map((raw) => {
    const t = raw as RawTicket;
    const catRaw = Array.isArray(t.category) ? t.category[0] : t.category;
    const spaceRaw = Array.isArray(t.space) ? t.space[0] : t.space;
    const spaceData = (spaceRaw ?? {}) as Record<string, unknown>;
    const buildingRaw = Array.isArray(spaceData.building) ? spaceData.building[0] : spaceData.building;

    return {
      id: String(t.id ?? ""),
      status: String(t.status ?? "pending"),
      category: (catRaw as { name: string } | null)?.name ?? "未分類",
      building: (buildingRaw as { name: string } | null)?.name ?? "未知大樓",
      space: String(spaceData.name ?? "未知空間"),
      floor: Number(spaceData.floor ?? 0),
      createdAt: String(t.created_at ?? ""),
    };
  });

  return <MyTicketsContent tickets={flatTickets} />;
}
