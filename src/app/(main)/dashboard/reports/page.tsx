import { redirect } from "next/navigation";

import type { Metadata } from "next";

import { createClient } from "@/lib/supabase/server";

import { fetchReportData } from "./_actions/report-actions";
import { ReportsDashboard } from "./_components/reports-dashboard";

export const metadata: Metadata = {
  title: "統計報表 - RepairHub",
  description: "全校修繕通報統計、空間分佈、分類佔比與處理時效報表儀表板。",
};

interface ReportsPageProps {
  searchParams: Promise<{
    range?: string;
    from?: string;
    to?: string;
  }>;
}

export default async function ReportsPage({ searchParams }: ReportsPageProps) {
  const supabase = await createClient();

  // 1. Authenticate user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // 2. Authorize admin role
  const { data: profile } = await supabase.from("profiles").select("user_role").eq("id", user.id).maybeSingle();

  if (profile?.user_role !== "admin") {
    redirect("/dashboard");
  }

  // 3. Resolve search params and fetch aggregated statistics
  const params = await searchParams;
  const data = await fetchReportData(params);

  return <ReportsDashboard initialData={data} />;
}
