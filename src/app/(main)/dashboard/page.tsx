import Link from "next/link";

import { ExternalLink, ShieldCheck, Wrench } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { fetchInternalAnnouncements } from "@/server/announcements";
import { getSession } from "@/server/auth/session";

import { fetchDashboardOpenTickets, fetchDashboardSummary } from "./_actions/dashboard-summary";
import { DashboardAnnouncementsCard } from "./_components/dashboard-announcements-card";
import { DashboardOpenQueue } from "./_components/dashboard-open-queue";
import { DashboardQuickLinks } from "./_components/dashboard-quick-links";
import { DashboardSummaryCards } from "./_components/dashboard-summary-cards";

export default async function DashboardPage() {
  const session = await getSession();

  if (!session || (session.role !== "admin" && session.role !== "technician")) {
    return null;
  }

  const isAdmin = session.role === "admin";
  const roleName = isAdmin ? "系統管理者" : "維修技師";
  const viewerContext = { role: session.role, userId: session.userId };
  const [summary, openTickets, internalAnnouncements] = await Promise.all([
    fetchDashboardSummary(session.supabase, viewerContext),
    fetchDashboardOpenTickets(session.supabase, viewerContext),
    fetchInternalAnnouncements(5),
  ]);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-6 shadow-xs sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <h1 className="font-bold font-heading text-2xl text-foreground tracking-tight">管理後台</h1>
            <Badge variant="secondary" className="gap-1 px-2.5 py-0.5">
              <ShieldCheck className="size-3.5 text-primary" />
              {roleName}
            </Badge>
          </div>
          <p className="text-muted-foreground text-sm">
            歡迎回來，<span className="font-medium text-foreground">{session.displayName ?? session.email}</span>
            。以下是目前修繕營運概況。
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/" className="gap-1.5">
              前台首頁
              <ExternalLink className="size-3.5" />
            </Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/report" className="gap-1.5">
              <Wrench className="size-3.5" />
              新增報修
            </Link>
          </Button>
        </div>
      </div>

      <DashboardSummaryCards summary={summary} isAdmin={isAdmin} />

      <div className="grid gap-4 lg:grid-cols-3">
        <DashboardOpenQueue tickets={openTickets} />
        <DashboardAnnouncementsCard announcements={internalAnnouncements} isAdmin={isAdmin} />
      </div>

      <DashboardQuickLinks role={session.role} />
    </div>
  );
}
