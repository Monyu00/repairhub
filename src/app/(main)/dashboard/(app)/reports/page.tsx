import { redirect } from "next/navigation";

import type { Metadata } from "next";

import { getSession } from "@/server/auth/session";

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
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  if (session.role !== "admin") {
    redirect("/dashboard");
  }

  // 2. Resolve search params and fetch aggregated statistics
  const params = await searchParams;
  const data = await fetchReportData(params);

  return <ReportsDashboard initialData={data} />;
}
