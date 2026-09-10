import Link from "next/link";

import { Plus, Wrench } from "lucide-react";
import type { Metadata } from "next";

import { Button } from "@/components/ui/button";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSession } from "@/server/auth/session";
import type { TicketStatus } from "@/server/tickets/lifecycle";
import { type QueryTicketsResult, queryTickets } from "@/server/tickets/query";

import { HomepageTabs } from "./_components/homepage-tabs";
import { MyTicketList } from "./_components/my-ticket-list";
import { PublicTicketList } from "./_components/public-ticket-list";
import { TicketFilters } from "./_components/ticket-filters";

export const metadata: Metadata = {
  title: "校園報修服務平台 - RepairHub",
  description: "公開透明的校園報修單進度查詢、線上通報與修繕管理服務。",
};

interface HomePageProps {
  searchParams: Promise<{
    tab?: string;
    page?: string;
    pageSize?: string;
    status?: string;
    building?: string;
    category?: string;
    q?: string;
  }>;
}

const DEFAULT_PAGE_SIZE = 15;

export default async function HomePage({ searchParams }: HomePageProps) {
  const params = await searchParams;
  const activeTab = params.tab === "my-tickets" ? "my-tickets" : "all";
  const currentPage = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);
  const pageSize = Math.max(
    1,
    Math.min(100, Number.parseInt(params.pageSize ?? String(DEFAULT_PAGE_SIZE), 10) || DEFAULT_PAGE_SIZE),
  );

  const activeStatuses: TicketStatus[] = ["pending", "in_progress", "completed"];
  const status = params.status && params.status !== "all" ? (params.status as TicketStatus) : activeStatuses;
  const buildingId = params.building && params.building !== "all" ? params.building : undefined;
  const categoryId = params.category && params.category !== "all" ? params.category : undefined;
  const searchTerm = params.q?.trim() || undefined;

  const session = await getSession();
  const isLoggedIn = Boolean(session?.email);
  const supabase = createAdminClient();

  // Concurrently fetch metadata for filters
  const [buildingsRes, categoriesRes, myTicketsSummary] = await Promise.all([
    supabase.from("buildings").select("id, name, code").order("code"),
    supabase.from("categories").select("id, name").eq("is_active", true).order("sort_order"),
    isLoggedIn && session?.email
      ? queryTickets(supabase, {
          reporterEmail: session.email,
          page: 1,
          pageSize: 1,
          viewerContext: {
            role: session.role,
            userId: session.userId,
            email: session.email,
          },
        })
      : Promise.resolve(null),
  ]);

  const buildings = buildingsRes.data ?? [];
  const categories = categoriesRes.data ?? [];
  const myTicketsCount = myTicketsSummary?.totalCount;

  // Fetch ticket records according to active tab
  let ticketsResult: QueryTicketsResult = { tickets: [], totalCount: 0 };

  if (activeTab === "my-tickets") {
    if (isLoggedIn && session?.email) {
      ticketsResult = await queryTickets(supabase, {
        reporterEmail: session.email,
        page: currentPage,
        pageSize,
        sort: { field: "created_at", ascending: false },
        viewerContext: {
          role: session.role,
          userId: session.userId,
          email: session.email,
        },
      });
    }
  } else {
    // All tickets (public list with privacy redaction)
    ticketsResult = await queryTickets(supabase, {
      status,
      buildingId,
      categoryId,
      search: searchTerm,
      page: currentPage,
      pageSize,
      sort: { field: "created_at", ascending: false },
      viewerContext: {
        role: session?.role ?? null,
        userId: session?.userId,
        email: session?.email,
      },
    });
  }

  const totalPages = Math.max(1, Math.ceil(ticketsResult.totalCount / pageSize));

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      {/* Hero Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-card via-card to-muted/40 p-6 shadow-xs sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="max-w-2xl space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 font-medium text-primary text-xs">
              <Wrench className="size-3.5" />
              <span>全校修繕通報入口</span>
            </div>
            <h1 className="font-extrabold font-heading text-2xl text-foreground tracking-tight sm:text-3xl">
              校園設備修繕與進度查詢
            </h1>
            <p className="text-muted-foreground text-xs leading-relaxed sm:text-sm">
              即時追蹤校舍設施與設備的通報進度，共同維護安全美好的校園環境。如發現設施損壞或異常，歡迎立即填單通報。
            </p>
          </div>

          <div className="flex shrink-0 items-center">
            <Button asChild size="lg" className="gap-2 shadow-xs">
              <Link href="/report">
                <Plus className="size-4" />
                <span>我要通報報修</span>
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="space-y-4">
        {/* Tabs Bar */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <HomepageTabs activeTab={activeTab} isLoggedIn={isLoggedIn} myTicketsCount={myTicketsCount} />
        </div>

        {/* Tab 1: All tickets */}
        {activeTab === "all" && (
          <div className="space-y-4">
            <TicketFilters buildings={buildings} categories={categories} />
            <PublicTicketList
              tickets={ticketsResult.tickets}
              currentPage={currentPage}
              totalPages={totalPages}
              totalCount={ticketsResult.totalCount}
              pageSize={pageSize}
            />
          </div>
        )}

        {/* Tab 2: My tickets */}
        {activeTab === "my-tickets" && (
          <MyTicketList
            tickets={ticketsResult.tickets}
            userEmail={session?.email ?? null}
            currentPage={currentPage}
            totalPages={totalPages}
            totalCount={ticketsResult.totalCount}
            pageSize={pageSize}
          />
        )}
      </div>
    </div>
  );
}
