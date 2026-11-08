import type { Metadata } from "next";

import { createClient } from "@/lib/supabase/server";
import { getSession } from "@/server/auth/session";
import { getRepairRecords } from "@/server/tickets/read";

import { RepairRecordsContent } from "./_components/repair-records-content";
import type { TechnicianOption } from "./_components/repair-records-types";

export const metadata: Metadata = {
  title: "維修紀錄 - RepairHub",
  description: "查看維修人員承接之維修紀錄，追蹤處理中、已完工與已結案單據。",
};

interface PageProps {
  searchParams: Promise<{
    q?: string;
    status?: string;
    technician?: string;
    page?: string;
  }>;
}

export default async function Page({ searchParams }: PageProps) {
  const params = await searchParams;

  const session = await getSession();

  if (!session?.userId || !session.role) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-muted-foreground">無法取得使用者資訊，請重新登入。</p>
      </div>
    );
  }

  const userRole = session.role;
  const isAdmin = userRole === "admin";
  const isTechnician = userRole === "technician";

  if (!isAdmin && !isTechnician) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-muted-foreground">您無權限檢視維修紀錄。</p>
      </div>
    );
  }

  const supabase = session.supabase ?? (await createClient());

  // Technicians list for admin filter dropdown
  let technicians: TechnicianOption[] = [];
  if (isAdmin) {
    const { data: techData } = await supabase
      .from("profiles")
      .select("id, display_name")
      .eq("user_role", "technician")
      .order("display_name", { ascending: true });

    technicians = (techData ?? []).map((t) => ({
      id: t.id,
      displayName: t.display_name || `技師 (${t.id.slice(0, 8)})`,
    }));
  }

  const {
    tickets: records,
    totalCount,
    page,
    pageSize,
  } = await getRepairRecords(supabase, {
    search: params.q,
    status: params.status,
    technicianId: params.technician,
    page: params.page,
    viewer: session,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-bold text-2xl text-foreground tracking-tight">維修紀錄</h1>
          <p className="text-muted-foreground text-sm">
            {isAdmin ? "檢視與追蹤全校各維修人員之接單及完工紀錄" : "檢視您承接的所有維修單據及處理進度"}
          </p>
        </div>
      </div>

      <RepairRecordsContent
        records={records}
        totalCount={totalCount}
        currentPage={page}
        pageSize={pageSize}
        isAdmin={isAdmin}
        technicians={technicians}
      />
    </div>
  );
}
